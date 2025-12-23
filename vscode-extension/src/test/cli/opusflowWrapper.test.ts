import { expect } from 'chai';
import * as sinon from 'sinon';
import { OpusFlowWrapper, CLIError } from '../../cli/opusflowWrapper';
import { ProcessManager } from '../../cli/processManager';

describe('OpusFlowWrapper', () => {
    let wrapper: OpusFlowWrapper;
    let processManagerStub: sinon.SinonStubbedInstance<ProcessManager>;

    beforeEach(() => {
        wrapper = new OpusFlowWrapper('opusflow');
        // @ts-ignore - accessing private property for testing
        processManagerStub = sinon.stub(wrapper['processManager']);
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('plan', () => {
        it('should call CLI and return parsed result', async () => {
            processManagerStub.run.resolves({
                stdout: 'Created plan: /path/to/plan.md',
                stderr: '',
                exitCode: 0
            });

            const result = await wrapper.plan('New Feature');
            expect(result.fullPath).to.equal('/path/to/plan.md');
            // eslint-disable-next-line @typescript-eslint/no-unused-expressions
            expect(processManagerStub.run.calledWith('opusflow', ['plan', 'New Feature'])).to.be.true;
        });

        it('should throw CLIError if command fails', async () => {
            processManagerStub.run.resolves({
                stdout: '',
                stderr: 'error message',
                exitCode: 1
            });

            try {
                await wrapper.plan('New Feature');
                expect.fail('Should have thrown CLIError');
            } catch (error) {
                expect(error).to.be.instanceOf(CLIError);
                expect((error as CLIError).message).to.contain('failed with exit code 1');
                expect((error as CLIError).stderr).to.equal('error message');
            }
        });

        it('should throw "CLI not found" error if ENOENT occurs', async () => {
            const error = new Error('spawn opusflow ENOENT') as any;
            error.code = 'ENOENT';
            processManagerStub.run.rejects(error);

            try {
                await wrapper.plan('New Feature');
                expect.fail('Should have thrown CLIError');
            } catch (error) {
                expect(error).to.be.instanceOf(CLIError);
                expect((error as CLIError).message).to.contain('OpusFlow CLI not found');
            }
        });
    });

    describe('isInstalled', () => {
        it('should return true if --help succeeds', async () => {
            processManagerStub.run.resolves({ stdout: '', stderr: '', exitCode: 0 });
            const installed = await wrapper.isInstalled();
            // eslint-disable-next-line @typescript-eslint/no-unused-expressions
            expect(installed).to.be.true;
        });

        it('should return false if --help fails', async () => {
            processManagerStub.run.rejects(new Error('not found'));
            const installed = await wrapper.isInstalled();
            // eslint-disable-next-line @typescript-eslint/no-unused-expressions
            expect(installed).to.be.false;
        });
    });
});
