// 하네스 전제가 깨졌을 때 던지는 예외. 라이브러리 동작은 예외로 표현하지 않고 스냅샷에 기록한다.
// class 대신 name을 붙인 Error를 만든다(코딩 규칙: class는 허용된 예외에만).
export const HARNESS_ERROR = 'HarnessError';

export const harnessError = (message: string): Error => Object.assign(new Error(message), { name: HARNESS_ERROR });

export const isHarnessError = (e: unknown): boolean => e instanceof Error && e.name === HARNESS_ERROR;
