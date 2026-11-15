
import { jest } from '@jest/globals';
import { ForbiddenException } from '@nestjs/common';

import { RlsContextService } from '../database/rls-context.service';
import { SubscriptionsService } from './subscriptions.service';

describe('SubscriptionsService security', () => {
  let service: SubscriptionsService;

  const rlsContextService = {
    run: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    service = new SubscriptionsService(
      rlsContextService as unknown as RlsContextService,
    );
  });

  it('rejects subscription creation before accessing the database', async () => {
    await expect(
      service.create(
        'user-id',
        'organization-id',
        'plan-id',
        'active',
        new Date('2026-11-01'),
        new Date('2026-12-01'),
        false,
      ),
    ).rejects.toThrow(ForbiddenException);

    expect(rlsContextService.run).not.toHaveBeenCalled();
  });

  it('rejects subscription updates before accessing the database', async () => {
    await expect(
      service.update(
        'user-id',
        'subscription-id',
        {
          status: 'active',
          cancel_at_period_end: false,
        },
      ),
    ).rejects.toThrow(ForbiddenException);

    expect(rlsContextService.run).not.toHaveBeenCalled();
  });

  it('preserves the subscription read methods', () => {
    expect(typeof service.findById).toBe('function');
    expect(typeof service.findByOrganizationId).toBe('function');
  });
});
