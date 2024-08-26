# Logi Bot

## Discord Command Handlers

- Define command structure
- Define, normalize, and validate inputs
- Prepare and serve response
- Handle and report errors

### TODO

- Raise errors on consumer side to RPC caller
- Access control close to logic (i.e. in service calls, on consumer side)

## Queue Consumers

- Call service methods to do the work
- Check user/member access
- Handle retry
- Delegate to other handlers
- Report errors to RPC caller
