import {
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateProfileDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  first_name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  last_name: string;
}