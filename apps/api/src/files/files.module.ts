import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module';
import { File } from '../entities/file.entity';

import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { FileStorageService } from './storage/file-storage.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([File]),
    AuthModule,
  ],

  controllers: [FilesController],

  providers: [
    FilesService,
    FileStorageService,
  ],

  exports: [
    FilesService,
    FileStorageService,
  ],
})
export class FilesModule {}