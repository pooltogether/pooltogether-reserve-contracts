// SPDX-License-Identifier: MIT

pragma solidity ^0.7.6;


interface IConfigurableReserve {
  /// @notice Returns the reserve rate for a particular source
  /// @param source The source for which the reserve rate should be return.  These are normally prize pools.
  /// @return The reserve rate as a fixed point 18 number, like Ether.  A rate of 0.05 = 50000000000000000
  function reserveRateMantissa(address source) external view returns (uint256);

  /// @notice Allows the owner of the contract to set the reserve rates for a given set of sources.
  /// @param sources The sources for which to set the reserve rates.
  /// @param _reserveRateMantissas The respective reserve rates for the sources.  Length must match sources param.
  function setReserveRateMantissa(address[] calldata sources, uint256[] calldata _reserveRateMantissas) external;



  event ReserveRateMantissaSet(address indexed prizePool, uint256 reserveRateMantissa);

}