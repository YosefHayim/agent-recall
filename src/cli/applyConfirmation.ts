import { confirm, isCancel } from '@clack/prompts';

export type ApplyConfirmationRequest = {
  readonly action: string;
  readonly apply: boolean | undefined;
  readonly json: boolean | undefined;
  readonly yes: boolean | undefined;
};

/**
 * Resolves whether an apply-mode command is confirmed.
 *
 * @param request - Apply flags and prompt message.
 * @returns Confirmation state for the command workflow.
 */
export const resolveApplyConfirmation = async (
  request: ApplyConfirmationRequest,
): Promise<boolean | undefined> => {
  if (request.apply !== true) {
    return undefined;
  }

  if (request.yes === true) {
    return true;
  }

  if (request.json === true) {
    return false;
  }

  if (process.stdin.isTTY !== true || process.stdout.isTTY !== true) {
    return false;
  }

  const answer = await confirm({
    message: `${request.action}. Continue?`,
    initialValue: false,
  });

  if (isCancel(answer)) {
    return false;
  }

  return answer === true;
};
