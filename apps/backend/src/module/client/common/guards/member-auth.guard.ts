import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class MemberAuthGuard extends AuthGuard('member-jwt') { }
