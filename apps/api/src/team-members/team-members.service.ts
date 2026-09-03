import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { TeamMember } from '../entities/team-member.entity';

@Injectable()
export class TeamMembersService {
  constructor(
    @InjectRepository(TeamMember)
    private readonly teamMembersRepository: Repository<TeamMember>,
  ) {}

  async findAll() {
    return this.teamMembersRepository.find();
  }

  async create(teamId: string, userId: string) {
    const teamMember = this.teamMembersRepository.create({
      team_id: teamId,
      user_id: userId,
    });

    return this.teamMembersRepository.save(teamMember);
  }
}