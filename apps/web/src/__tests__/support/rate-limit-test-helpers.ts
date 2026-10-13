export function configureRateLimitIdentityMocks(
  identityMock: { mockResolvedValue: (value: unknown) => unknown },
  ipMock: { mockResolvedValue: (value: string) => unknown },
) {
  identityMock.mockResolvedValue({
    scope: "anonymous",
    value: "198.51.100.20",
    key: "anonymous:198.51.100.20",
  });
  ipMock.mockResolvedValue("198.51.100.20");
}
