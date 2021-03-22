// SPDX-License-Identifier: MIT

pragma solidity ^0.7.6;

import "@openzeppelin/contracts/access/Ownable.sol";

import "./IConfigurableReserve.sol";

contract ConfigurableReserve is IConfigurableReserve, Ownable {
    
    mapping(address => uint256) public prizePoolMantissas;

    constructor() Ownable(){

    }

    function reserveRateMantissa(address source) external override view returns (uint256){
        return prizePoolMantissas[source];
    }

    function setReserveRateMantissa(address[] calldata sources, uint256[] calldata _reserveRateMantissas) external override onlyOwner{

        for(uint256 i = 0; i <  sources.length; i++){
            prizePoolMantissas[sources[i]] = _reserveRateMantissas[i];
            emit ReserveRateMantissaSet(sources[i], _reserveRateMantissas[i]);
        }
    }



}