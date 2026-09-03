import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Team } from '../entities/team.entity';

@Injectable()
export class TeamsService {
  constructor(
    @InjectRepository(Team)
    private readonly teamsRepository: Repository<Team>,
  ) {}

  async findAll() {
    return this.teamsRepository.find();
  }

  async create(
    organizationId: string,
    name: string,
    slug: string,
  ) {
    const team = this.teamsRepository.create({
      organization_id: organizationId,
      name,
      slug,
    });

    return this.teamsRepository.save(team);
  }
}