declare module 'express-serve-static-core' {
  interface Request {
    // Authenticated regular user
    user?: {
      id: string;
      email: string;
      roleId: string;
    };
    // Authenticated admin
    admin?: {
      id: string;
      email: string;
    };
  }
}

export {};
