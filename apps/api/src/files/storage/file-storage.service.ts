import { Injectable } from '@nestjs/common';
import {
  promises as fs,
} from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';

@Injectable()
export class FileStorageService {
  private readonly uploadDirectory =
    join(
      process.cwd(),
      'storage',
      'uploads',
    );

  async save(
    file: Express.Multer.File,
  ) {
    await fs.mkdir(
      this.uploadDirectory,
      {
        recursive: true,
      },
    );

    const extension =
      file.originalname.includes('.')
        ? file.originalname
            .slice(
              file.originalname
                .lastIndexOf('.'),
            )
        : '';

    const storageKey =
      `${randomUUID()}${extension}`;

    const filePath =
      join(
        this.uploadDirectory,
        storageKey,
      );

    await fs.writeFile(
      filePath,
      file.buffer,
    );

    return {
      storageKey,
      filePath,
    };
  }
}