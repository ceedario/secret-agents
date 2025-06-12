import type { Linter } from 'eslint';
export declare const settings: {
    'import/resolver': {
        node: {
            extensions: string[];
        };
        typescript: {};
    };
};
export declare const nodeConfig: Array<Linter.Config>;
export declare const electronConfig: Array<Linter.Config>;
export declare const cliConfig: Array<Linter.Config>;
export declare const workerConfig: Array<Linter.Config>;
export default nodeConfig;
//# sourceMappingURL=index.d.ts.map