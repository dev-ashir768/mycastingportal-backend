-- AlterTable
ALTER TABLE `admin_tokens` MODIFY `token` VARCHAR(512) NOT NULL;

-- AlterTable
ALTER TABLE `roles` MODIFY `description` TEXT NOT NULL;

-- AlterTable
ALTER TABLE `tokens` MODIFY `token` VARCHAR(512) NOT NULL;
