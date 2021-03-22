// SPDX-License-Identifier: MIT

pragma solidity ^0.7.6;

import "@openzeppelin/contracts/access/Ownable.sol";

import "./IConfigurableReserve.sol";

///@title implementation of IConfigurable reserve
contract ConfigurableReserve is IConfigurableReserve, Ownable {
    
      /// @notice Storage of Reserve Rate Mantissa associated with a Prize Pool
    mapping(address => uint256) public prizePoolMantissas;

    constructor() Ownable(){

    }


    /// @notice Returns the reserve rate for a particular source
    /// @param source The source for which the reserve rate should be return.  These are normally prize pools.
    /// @return The reserve rate as a fixed point 18 number, like Ether.  A rate of 0.05 = 50000000000000000
    function reserveRateMantissa(address source) external override view returns (uint256){
        return prizePoolMantissas[source];
    }

    /// @notice Allows the owner of the contract to set the reserve rates for a given set of sources.
    /// @param sources The sources for which to set the reserve rates.
    /// @param _reserveRateMantissas The respective reserve rates for the sources.  Length must match sources param.
    function setReserveRateMantissa(address[] calldata sources, uint256[] calldata _reserveRateMantissas) external override onlyOwner{
        // require equal lengths or will revert anyway?
        for(uint256 i = 0; i <  sources.length; i++){
            prizePoolMantissas[sources[i]] = _reserveRateMantissas[i];
            emit ReserveRateMantissaSet(sources[i], _reserveRateMantissas[i]);
        }
    }



}