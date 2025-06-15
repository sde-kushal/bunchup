import { Module } from "@nestjs/common";
import { ForumPostService } from "./forum.post.service";

@Module({
    imports: [

    ],
    providers: [ForumPostService],
    exports: [ForumPostService]
})
export class ForumPostModule { }