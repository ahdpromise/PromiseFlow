import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Feature } from '../entities/features.entity';

@Injectable()
export class FeaturesService {
  constructor(
    @InjectRepository(Feature)
    private readonly featuresRepository: Repository<Feature>,
  ) {}

  async findAll() {
    return this.featuresRepository.find({
      where: {
        is_active: true,
      },
      order: {
        name: 'ASC',
      },
    });
  }

  async create(
    name: string,
    slug: string,
    description: string | null,
    value_type: string,
  ) {
    const feature = this.featuresRepository.create({
      name,
      slug,
      description,
      value_type,
      is_active: true,
    });

    return this.featuresRepository.save(feature);
  }
}