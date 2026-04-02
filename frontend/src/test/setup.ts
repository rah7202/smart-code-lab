import "@testing-library/jest-dom";

import { vi } from "vitest";

// Disable React act warnings in tests
process.env.REACT_DISABLE_ACT_WARNING = "true";

vi.mock("axios", () => {
  const mockAxiosInstance = {
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  };

  return {
    default: {
      create: vi.fn(() => mockAxiosInstance),
      ...mockAxiosInstance,
    },
  };
});