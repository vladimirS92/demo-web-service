import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(username: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('Invalid username or password');
    }
    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
    });
    return {
      accessToken,
      user: { id: user.id, username: user.username, name: user.name, role: user.role },
    };
  }
}
