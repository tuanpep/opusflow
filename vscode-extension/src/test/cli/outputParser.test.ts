import { expect } from 'chai';
import { OutputParser } from '../../cli/outputParser';

describe('OutputParser', () => {
    let parser: OutputParser;

    beforeEach(() => {
        parser = new OutputParser();
    });

    describe('parsePlanOutput', () => {
        it('should correctly parse plan path and filename', () => {
            const stdout = 'Created plan: /path/to/project/opusflow-planning/plan-2023-12-22-feat.md\nTo fill this plan, run:\n  opusflow prompt plan plan-2023-12-22-feat.md';
            const result = parser.parsePlanOutput(stdout);
            expect(result.fullPath).to.equal('/path/to/project/opusflow-planning/plan-2023-12-22-feat.md');
            expect(result.filename).to.equal('plan-2023-12-22-feat.md');
        });

        it('should throw error if output is invalid', () => {
            const stdout = 'Some random error message';
            expect(() => parser.parsePlanOutput(stdout)).to.throw('Failed to parse plan output');
        });
    });

    describe('parseVerifyOutput', () => {
        it('should correctly parse verify report path', () => {
            const stdout = 'Verification report created: /path/to/project/opusflow-planning/verify-2023-12-22.md';
            const result = parser.parseVerifyOutput(stdout);
            expect(result.fullPath).to.equal('/path/to/project/opusflow-planning/verify-2023-12-22.md');
        });

        it('should throw error if output is invalid', () => {
            const stdout = 'Some random error message';
            expect(() => parser.parseVerifyOutput(stdout)).to.throw('Failed to parse verify output');
        });
    });

    describe('parsePromptOutput', () => {
        it('should return trimmed stdout', () => {
            const stdout = '  \nThis is the prompt content\n  ';
            const result = parser.parsePromptOutput(stdout);
            expect(result).to.equal('This is the prompt content');
        });
    });
});
