import { MigrationInterface, QueryRunner } from "typeorm";

export class TicketHandling1715341036517 implements MigrationInterface {
    name = 'TicketHandling1715341036517'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "app"."ticket" DROP CONSTRAINT "FK_4f9302cff43aa2af13816fa5a5b"`);
        await queryRunner.query(`ALTER TABLE "app"."ticket" ADD CONSTRAINT "FK_4f9302cff43aa2af13816fa5a5b" FOREIGN KEY ("crew_channel_sf") REFERENCES "app"."crew"("crew_channel_sf") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "app"."ticket" DROP CONSTRAINT "FK_4f9302cff43aa2af13816fa5a5b"`);
        await queryRunner.query(`ALTER TABLE "app"."ticket" ADD CONSTRAINT "FK_4f9302cff43aa2af13816fa5a5b" FOREIGN KEY ("crew_channel_sf") REFERENCES "app"."crew"("crew_channel_sf") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
