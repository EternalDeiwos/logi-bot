import { PickType } from '@nestjs/swagger';
import { Crew } from 'src/core/crew/crew.entity';

export class SelectCrewDto extends PickType(Crew, ['crewSf'] as const) {}
