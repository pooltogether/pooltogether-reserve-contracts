# PoolTogether Reserve
[![Coverage Status](https://coveralls.io/repos/github/pooltogether/pooltogether-reserve-contracts/badge.svg?branch=main)](https://coveralls.io/github/pooltogether/pooltogether-reserve-contracts?branch=main)

PoolTogether captures a portion of the yield produced by the prize pools as "reserve".  The percentage of yield that is captured is called the "reserve rate".

Currently (before this implementation) there is a single, global reserve rate that is applied to all pools.  However, PoolTogether governance will like to set a higher reserve rate for governance-managed pools, and do not wish to affect community pools.

The Configurable Reserve contracts outline a new Reserve interface that will allow governance to configure a reserve rate for each pool separately, as well as setting an opt-out default rate across all prize pools.

# Interface

A prize pools reserve rate can be set by calling:
```solidity
function setReserveRateMantissa(address[] calldata sources,  uint224[] calldata _reserveRates, bool[] calldata useCustom) external;
```
The `useCustom` boolean flag overrides the use of the default pool-wide reserve rate. 
Note that only the owner of the contract can call this function. In the case of PoolTogether the owner will be the governance (timelock) contract.


A prize pools reserve rate can be viewed by calling:
```solidity
function reserveRateMantissa(address source) external view returns (uint256);
```

The default reserve rate across all prize pools can be set with: 
```solidity
function setDefaultReserveRateMantissa(uint224 _reserveRateMantissa) external override
```
Note: only the contract owner can call this function. 


The concept of a withdrawStrategist allows the reserve to be withdrawn by a custom `withdrawStrategist` address. This can be set by calling:
```solidity
function setWithdrawStrategist(address _strategist) external override onlyOwner{
```
Note: only the contract ower can call this function. 


The actual reserve amount can be withdrawn from a prize pool by either the contract owner or the `withdrawStrategist` by calling:
```solidity
 function withdrawReserve(address prizePool, address to) external override onlyOwnerOrWithdrawStrategist returns (uint256)
```


# To deploy
## Locally
To deploy locally for development run:
`yarn deploy localhost`

# Testing
To test the contracts locally run:
`yarn && yarn test`

## Coverage
To display contract coverage run: 
`yarn coverage`



# Configurable Reserve Specification

The interface [IConfigurableReserve.sol](./contracts/IConfigurableReserve.sol) implements the [ReserveInterface.sol](https://github.com/pooltogether/pooltogether-pool-contracts/blob/ba34ddfb7670c04d5c108e6ce485343b46b27a1e/contracts/reserve/ReserveInterface.sol).
