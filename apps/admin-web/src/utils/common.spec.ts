import { describe, it, expect } from 'vitest';
import { transformRecordToOption, humpToLine, toggleHtmlClass } from './common';

describe('common utils', () => {
  describe('transformRecordToOption', () => {
    it('should transform record to option array', () => {
      const record = { key1: 'label1', key2: 'label2' };
      const options = transformRecordToOption(record);
      expect(options).toHaveLength(2);
      expect(options[0]).toEqual({ value: 'key1', label: 'label1' });
      expect(options[1]).toEqual({ value: 'key2', label: 'label2' });
    });

    it('should return empty array for empty record', () => {
      expect(transformRecordToOption({})).toEqual([]);
    });
  });

  describe('humpToLine', () => {
    it('should convert camelCase to kebab-case by default', () => {
      expect(humpToLine('userName')).toBe('user-name');
      expect(humpToLine('roleKey')).toBe('role-key');
    });

    it('should use custom line character', () => {
      expect(humpToLine('userName', '_')).toBe('user_name');
    });

    it('should handle first letter uppercase', () => {
      expect(humpToLine('UserName')).toBe('user-name');
    });
  });

  describe('toggleHtmlClass', () => {
    it('should add and remove class on documentElement', () => {
      const { add, remove } = toggleHtmlClass('test-class');
      add();
      expect(document.documentElement.classList.contains('test-class')).toBe(true);
      remove();
      expect(document.documentElement.classList.contains('test-class')).toBe(false);
    });
  });
});
