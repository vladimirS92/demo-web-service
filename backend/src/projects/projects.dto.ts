import { PartialType } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateProjectDto {
  @IsString() @IsNotEmpty() @MaxLength(100)
  name!: string;

  @IsString() @IsOptional() @MaxLength(500)
  description?: string;

  @IsString() @IsNotEmpty() @MaxLength(300)
  repoUrl!: string;

  @IsString() @IsOptional() @MaxLength(100)
  defaultBranch?: string;

  @IsString() @IsOptional() @MaxLength(50)
  stack?: string;

  @IsString() @IsOptional() @MaxLength(100)
  owner?: string;
}

export class UpdateProjectDto extends PartialType(CreateProjectDto) {}
