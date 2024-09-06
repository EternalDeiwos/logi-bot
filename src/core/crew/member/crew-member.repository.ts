import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CommonRepository } from 'src/database/util';
import { CrewMember } from './crew-member.entity';

@Injectable()
export class CrewMemberRepository extends CommonRepository<CrewMember> {
  constructor(private readonly dataSource: DataSource) {
    super(CrewMember, dataSource.createEntityManager());
  }
}
