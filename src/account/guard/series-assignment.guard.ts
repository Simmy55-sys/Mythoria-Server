// Guard to check if user is assigned to a series
import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { CanActivate, ExecutionContext } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Request } from "express";
import { Role } from "src/global/enum";
import { Series } from "src/model/series.entity";
import { Repository } from "typeorm";

@Injectable()
export class SeriesAssignmentGuard implements CanActivate {
  constructor(
    @InjectRepository(Series) private readonly seriesRepo: Repository<Series>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: Request = context.switchToHttp().getRequest();
    const { user } = request;
    if (!user)
      throw new UnauthorizedException(
        "User not authorised to access this route.",
      );
    const { role: userRole } = user;

    if (userRole !== Role.TRANSLATOR)
      throw new UnauthorizedException(
        "User not authorised to access this route. User is not a translator.",
      );
    const { seriesId } = request.params;
    const series = await this.seriesRepo.findOne({ where: { id: seriesId } });

    if (!series) throw new NotFoundException("Series not found.");
    return true;
  }
}
