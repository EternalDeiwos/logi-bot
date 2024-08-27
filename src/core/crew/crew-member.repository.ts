import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { CrewMember } from './crew-member.entity';

@Injectable()
export class CrewMemberRepository extends Repository<CrewMember> {
  constructor(private readonly dataSource: DataSource) {
    super(CrewMember, dataSource.createEntityManager());
  }
}
