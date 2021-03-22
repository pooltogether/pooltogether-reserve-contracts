# PoolTogether Reserve

PoolTogether captures a portion of the yield produced by the prize pools as "reserve".  The percentage of yield that is captured is called the "reserve rate".

Currently there is a single, global reserve rate that is applied to all pools.  However, PoolTogether governance will like to set a higher reserve rate for governance-managed pools, and do not wish to affect community pools.

This specification outlines a new Reserve interface that will allow governance to configure a reserve rate for each pool separately.

# To deploy
## Locally
`yarn deploy localhost`

# Testing
`yarn && yarn test`



# Configurable Reserve Specification

The interface [IConfigurableReserve.sol](./contracts/IConfigurableReserve.sol) implements the [ReserveInterface.sol](https://github.com/pooltogether/pooltogether-pool-contracts/blob/ba34ddfb7670c04d5c108e6ce485343b46b27a1e/contracts/reserve/ReserveInterface.sol) as well as one additional function:

```solidity
function setReserveRateMantissa(address[] sources, uint256[] _reserveRateMantissas) external;
```

This function allows the reserve rate to be set specifically per-source (i.e. pool).  Note that this should be a privileged call!
