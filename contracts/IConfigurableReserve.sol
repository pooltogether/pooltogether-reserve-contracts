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

  /// @notice Allows the owner of the contract to set the withdrawal strategy address
  /// @param _strategist The new withdrawal strategist address
  function setWithdrawStrategist(address strategist) external;

  /// @notice Calls withdrawReserve on the Prize Pool
  /// @param prizePool The Prize Pool to withdraw reserve
  /// @param to The reserve transfer destination address
  function withdrawReserve(address prizePool, address to) external returns (uint256);

  /// @notice Sets the default ReserveRate mantissa
  /// @param _reserveRateMantissa The new default reserve rate mantissa
  function setDefaultReserveRateMantissa(uint224 _reserveRateMantissa) external;
  
  /// @notice Uses the default reserve rate mantissa for an address
  /// @param source Address for which to use the default reserve rate
  function useDefaultReserveRateMantissa(address source) external;

  /// @notice Emitted when the reserve rate mantissa was updated for a prize pool
  /// @param prizePool The prize pool address for which the rate was set
  /// @param reserveRateMantissas The respective reserve rates for the prizepool.
  event ReserveRateMantissaSet(address indexed prizePool, uint256 reserveRateMantissa);

   /// @notice Emitted when the withdraw strategist is changed
  /// @param strategist The updated strategist address
  event ReserveWithdrawStrategistChanged(address indexed strategist);

  /// @notice Emitted when the default reserve rate mantissa was updated
  /// @param rate The new updated default mantissa rate
  event DefaultReserveRateMantissaSet(uint256 rate);

  /// @notice Emitted when a prize pool uses the default reserve rate
  /// @param source The prize pool address now using the default rate
  event UsingDefaultReserveRateMantissa(address indexed source);

}