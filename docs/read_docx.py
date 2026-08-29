import docx
import sys

def read_docx(filename):
    doc = docx.Document(filename)
    with open('extracted_utf8.txt', 'w', encoding='utf-8') as f:
        for para in doc.paragraphs:
            f.write(para.text + '\n')

if __name__ == '__main__':
    read_docx(sys.argv[1])
