import re

with open('seed_data/seed.py', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update the specific text
content = content.replace(
    '\"text\": \"Revisa el esquema de ayuda visual. Si tu investigación busca ver el efecto de aplicar un nuevo software sin un grupo de control, ¿qué tipo de diseño cuantitativo es?\",',
    '\"text\": \"Si tu investigación busca ver el efecto de aplicar un nuevo software sin un grupo de control, ¿qué tipo de diseño cuantitativo es?\",'
)

# 2. We only want to remove 'image_filename' from SABER_QUESTIONS.
# SABER_QUESTIONS block starts at 'SABER_QUESTIONS = [' and ends at 'SABER_HACER_QUESTIONS = ['
saber_start = content.find('SABER_QUESTIONS = [')
saber_end = content.find('SABER_HACER_QUESTIONS = [')

if saber_start != -1 and saber_end != -1:
    saber_part = content[saber_start:saber_end]
    # Remove lines containing '\"image_filename\":'
    saber_part_new = re.sub(r'\s*\"image_filename\":\s*\"[^\"]+\",', '', saber_part)
    content = content[:saber_start] + saber_part_new + content[saber_end:]

with open('seed_data/seed.py', 'w', encoding='utf-8') as f:
    f.write(content)
