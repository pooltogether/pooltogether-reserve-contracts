// SPDX-License-Identifier: MIT

pragma solidity ^0.7.6;

import "@openzeppelin/contracts/access/Ownable.sol";

import "./IConfigurableReserve.sol";
import "./IPrizePool.sol";

///@title implementation of IConfigurable reserve
contract ConfigurableReserve is IConfigurableReserve, Ownable {
    
    ///@notice struct to store the reserve rate mantissa for an address and a flag to indicate to use the default reserve rate
    struct ReserveRate{
        uint224 rateMantissa;
        bool useDefault;
    }


    /// @notice Storage of Reserve Rate Mantissa associated with a Prize Pool
    mapping(address => ReserveRate) public prizePoolMantissas;

    /// @notice Storage of the address of a withdrawal strategist 
    address public withdrawStrategist;

    /// @notice Storage of the default rate mantissa
    uint224 public defaultReserveRateMantissa;

    constructor() Ownable(){

    }

    /// @notice Returns the reserve rate for a particular source
    /// @param source The source for which the reserve rate should be return.  These are normally prize pools.
    /// @return The reserve rate as a fixed point 18 number, like Ether.  A rate of 0.05 = 50000000000000000
    function reserveRateMantissa(address source) external override view returns (uint256){
        if(prizePoolMantissas[source].useDefault == true){
            return uint256(defaultReserveRateMantissa);
        }
        // else return the custom rate
        return prizePoolMantissas[source].rateMantissa;
    }

    /// @notice Allows the owner of the contract to set the reserve rates for a given set of sources.
    /// @param sources The sources for which to set the reserve rates.
    /// @param _reserveRateMantissas The respective reserve rates for the sources.  Length must match sources param.
    function setReserveRateMantissa(address[] calldata sources, uint256[] calldata _reserveRateMantissas) external override onlyOwner{

        for(uint256 i = 0; i <  sources.length; i++){
            prizePoolMantissas[sources[i]].rateMantissa = uint224(_reserveRateMantissas[i]);
            emit ReserveRateMantissaSet(sources[i], _reserveRateMantissas[i]);
        }
    }

    /// @notice Allows the owner of the contract to set the withdrawal strategy address
    /// @param _strategist The new withdrawal strategist address
    function setWithdrawStrategist(address _strategist) external override onlyOwner{
        withdrawStrategist = _strategist;
        emit ReserveWithdrawStrategistChanged(_strategist);
    }

    /// @notice Calls withdrawReserve on the Prize Pool
    /// @param prizePool The Prize Pool to withdraw reserve
    /// @param to The reserve transfer destination address
    function withdrawReserve(address prizePool, address to) external override onlyOwnerOrWithdrawStrategist returns (uint256){
        return PrizePoolInterface(prizePool).withdrawReserve(to);
    }

    /// @notice Sets the default ReserveRate mantissa
    /// @param _reserveRateMantissa The new default reserve rate mantissa
    function setDefaultReserveRateMantissa(uint224 _reserveRateMantissa) external override onlyOwner{
        defaultReserveRateMantissa = _reserveRateMantissa;
        emit DefaultReserveRateMantissaSet(_reserveRateMantissa);
    }

    /// @notice Uses the default reserve rate mantissa for an address
    /// @param source Address for which to use the 
    function useDefaultReserveRateMantissa(address source) external override onlyOwner{
        prizePoolMantissas[source].useDefault = true;
        UsingDefaultReserveRateMantissa(source);
    }


    /// @notice Only allows the owner or current strategist to call a function
    modifier onlyOwnerOrWithdrawStrategist(){
        require(msg.sender == owner() || msg.sender == withdrawStrategist, "!onlyOwnerOrWithdrawStrategist");
        _;
    }
}