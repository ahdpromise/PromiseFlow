import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';

@Injectable()
export class RlsContextService {
  constructor(
    private readonly dataSource: DataSource,
  ) {}

  async run<T>(
    userId: string,
    callback: (manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    return this.dataSource.transaction(async (manager) => {
      await manager.query(
        `SELECT set_config('app.user_id', $1, true)`,
        [userId],
      );

      return callback(manager);
    });
  }
}