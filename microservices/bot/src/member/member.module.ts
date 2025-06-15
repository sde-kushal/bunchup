import { Module } from "@nestjs/common";
import { MemberService } from "./member.service";
import { RedisModule } from "src/_redis/redis.module";

@Module({
    imports: [
        RedisModule
    ],
    providers: [MemberService],
    exports: [MemberService],
})
export class MemberModule { }
