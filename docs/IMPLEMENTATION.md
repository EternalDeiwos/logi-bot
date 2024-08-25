# Logi Bot

## Discord Command Handlers

- Define command structure
- Define, normalize, and validate inputs
- ~~Check user/member permissions~~
  - _Note:_ This is not ideal. Access control should be done as close to the logic as possible.
- Prepare and serve response
- Handle and report errors

### TODO

- Raise errors on consumer side to RPC caller
- Access control close to logic (i.e. in service calls, on consumer side)

## Queue Consumers

- Call service methods to do the work
- Handle retry
- Delegate to other handlers
