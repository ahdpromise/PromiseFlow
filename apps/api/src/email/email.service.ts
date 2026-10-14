import {
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly resend: Resend;
  private readonly fromEmail: string;
  private readonly frontendUrl: string;

  constructor(
    private readonly configService: ConfigService,
  ) {
    const apiKey =
      this.configService.get<string>(
        'RESEND_API_KEY',
      );

    const fromEmail =
      this.configService.get<string>(
        'RESEND_FROM_EMAIL',
      );

    const frontendUrl =
      this.configService.get<string>(
        'FRONTEND_URL',
      );

    if (
      !apiKey ||
      !fromEmail ||
      !frontendUrl
    ) {
      throw new Error(
        'Email configuration is missing',
      );
    }

    this.resend = new Resend(apiKey);
    this.fromEmail = fromEmail;
    this.frontendUrl =
      frontendUrl.replace(/\/$/, '');
  }

  async sendInvitation(
    email: string,
    invitationToken: string,
  ): Promise<void> {
    const invitationUrl =
      `${this.frontendUrl}` +
      `/invitations/accept?token=` +
      encodeURIComponent(
        invitationToken,
      );

    const { error } =
      await this.resend.emails.send({
        from: this.fromEmail,
        to: email,
        subject:
          'You are invited to PromiseFlow',
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6;">
            <h2>You're invited to PromiseFlow</h2>
            <p>
              You have been invited to join a workspace on PromiseFlow.
            </p>
            <p>
              <a
                href="${invitationUrl}"
                style="
                  display: inline-block;
                  padding: 10px 16px;
                  background: #111827;
                  color: #ffffff;
                  text-decoration: none;
                  border-radius: 6px;
                "
              >
                Accept invitation
              </a>
            </p>
            <p>
              If the button does not work, open this link:
            </p>
            <p>${invitationUrl}</p>
          </div>
        `,
      });

    if (error) {
      throw new InternalServerErrorException(
        'Invitation email could not be sent',
      );
    }
  }
}