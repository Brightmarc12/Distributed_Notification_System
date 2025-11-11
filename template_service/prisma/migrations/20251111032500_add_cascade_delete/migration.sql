-- DropForeignKey
ALTER TABLE "TemplateVersion" DROP CONSTRAINT "TemplateVersion_template_id_fkey";

-- AddForeignKey
ALTER TABLE "TemplateVersion" ADD CONSTRAINT "TemplateVersion_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "Template"("id") ON DELETE CASCADE ON UPDATE CASCADE;

