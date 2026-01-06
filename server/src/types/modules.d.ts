declare module 'useragent' {
    const parse: (agent: string) => any;
    export { parse };
}

declare module 'useragent/lib/useragent' {
    const parse: (agent: string) => any;
    export { parse };
}

declare module 'uuid';
declare module 'fs-extra';
declare module 'bcryptjs';
declare module 'mime-types';
declare module 'cookie-parser';
declare module 'request-ip';
declare module 'helmet';
declare module 'passport-jwt';

declare namespace Express {
    interface Request {
        user?: any;
        realIP?: string;
    }
}
