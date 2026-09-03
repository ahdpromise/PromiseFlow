import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Plan } from '../entities/plans.entity';

@Injectable()
export class PlansService {
  constructor(
    @InjectRepository(Plan)
    private readonly plansRepository: Repository<Plan>,
  ) {}

  async findAll() {
    return this.plansRepository.find({
      where: {
        is_active: true,
      },
      order: {
        price: 'ASC',
      },
    });
  }

  async create(
    name: string,
    slug: string,
    description: string | null,
    price: string,
    currency: string,
    billing_interval: string,
  ) {
    const plan = this.plansRepository.create({
      name,
      slug,
      description,
      price,
      currency,
      billing_interval,
      is_active: true,
    });

    return this.plansRepository.save(plan);
  }
}