#!/usr/bin/env python3
import os
import re
import glob

def fix_withopacity_in_file(file_path):
    """Dosyadaki withOpacity kullanımlarını withValues ile değiştir"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # withOpacity kullanımlarını bul ve değiştir
        # Örnek: Colors.white.withOpacity(0.1) -> Colors.white.withValues(alpha: 0.1)
        pattern = r'(\w+(?:\.\w+)*)\.withOpacity\(([^)]+)\)'
        replacement = r'\1.withValues(alpha: \2)'
        
        new_content = re.sub(pattern, replacement, content)
        
        if new_content != content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Fixed: {file_path}")
            return True
        return False
    except Exception as e:
        print(f"Error processing {file_path}: {e}")
        return False

def main():
    """Tüm Dart dosyalarında withOpacity kullanımlarını düzelt"""
    dart_files = glob.glob('lib/**/*.dart', recursive=True)
    
    fixed_count = 0
    for file_path in dart_files:
        if fix_withopacity_in_file(file_path):
            fixed_count += 1
    
    print(f"\nTotal files fixed: {fixed_count}")

if __name__ == "__main__":
    main() 