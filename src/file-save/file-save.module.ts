import { Module } from '@nestjs/common';
import { FileSaveService } from './file-save.service';

@Module({
    providers: [FileSaveService],
    exports: [FileSaveService],
})
export class FileSaveModule {}
