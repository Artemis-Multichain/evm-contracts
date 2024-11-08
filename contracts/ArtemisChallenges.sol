// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@chainlink/contracts/src/v0.8/automation/AutomationCompatible.sol";

contract ArtemisChallengesV2 is
    AutomationCompatibleInterface,
    Ownable,
    ReentrancyGuard,
    Pausable
{
    uint256 private nextChallengeId;
    IERC20 public immutable usdcToken;

    enum PrizeType { ETH, USDC }

    struct Challenge {
        string ipfsUrl;
        uint256 duration;
        uint256 startTime;
        bool isActive;
        address payable winner;
        uint256 prizeAmount;
        PrizeType prizeType;
    }

    struct Submission {
        string ipfsHash;
        address submitter;
        uint256 voteCount;
    }

    mapping(uint256 => Challenge) private challenges;
    mapping(uint256 => Submission[]) private challengeSubmissions;
    mapping(uint256 => mapping(address => bool)) private hasVoted;

    event ChallengeCreated(
        uint256 challengeId,
        string ipfsUrl,
        uint256 duration,
        uint256 prizeAmount,
        PrizeType prizeType
    );
    event SolutionSubmitted(
        uint256 challengeId,
        address submitter,
        string ipfsHash
    );
    event Voted(uint256 challengeId, address voter, uint256 submissionIndex);
    event PrizeDistributed(
        uint256 challengeId,
        address winner,
        uint256 prizeAmount,
        PrizeType prizeType
    );

    constructor(address _usdcToken) Ownable(msg.sender) {
        usdcToken = IERC20(_usdcToken);
    }

    function createChallengeWithETH(
        string memory ipfsUrl,
        uint256 durationInSeconds,
        uint256 prizeAmount
    ) public payable whenNotPaused {
        require(msg.value == prizeAmount, "Incorrect prize amount");
        require(prizeAmount > 0, "Prize amount must be greater than 0");
        _createChallenge(ipfsUrl, durationInSeconds, prizeAmount, PrizeType.ETH);
    }

    function createChallengeWithUSDC(
        string memory ipfsUrl,
        uint256 durationInSeconds,
        uint256 prizeAmount
    ) public whenNotPaused {
        require(prizeAmount > 0, "Prize amount must be greater than 0");
        require(
            usdcToken.transferFrom(msg.sender, address(this), prizeAmount),
            "USDC transfer failed"
        );
        _createChallenge(ipfsUrl, durationInSeconds, prizeAmount, PrizeType.USDC);
    }

    function _createChallenge(
        string memory ipfsUrl,
        uint256 durationInSeconds,
        uint256 prizeAmount,
        PrizeType prizeType
    ) private {
        uint256 challengeId = nextChallengeId++;
        challenges[challengeId] = Challenge({
            ipfsUrl: ipfsUrl,
            duration: durationInSeconds,
            startTime: block.timestamp,
            isActive: true,
            winner: payable(address(0)),
            prizeAmount: prizeAmount,
            prizeType: prizeType
        });

        emit ChallengeCreated(
            challengeId,
            ipfsUrl,
            durationInSeconds,
            prizeAmount,
            prizeType
        );
    }

    function submitSolution(
        uint256 challengeId,
        string memory ipfsHash
    ) public whenNotPaused {
        require(challenges[challengeId].isActive, "Challenge is not active");
        challengeSubmissions[challengeId].push(
            Submission({
                ipfsHash: ipfsHash,
                submitter: msg.sender,
                voteCount: 0
            })
        );

        emit SolutionSubmitted(challengeId, msg.sender, ipfsHash);
    }

    function voteForSolution(
        uint256 challengeId,
        uint256 submissionIndex
    ) public whenNotPaused {
        require(challenges[challengeId].isActive, "Challenge is not active");
        require(!hasVoted[challengeId][msg.sender], "Already voted");
        require(
            submissionIndex < challengeSubmissions[challengeId].length,
            "Invalid submission index"
        );

        Submission storage submission = challengeSubmissions[challengeId][
            submissionIndex
        ];
        submission.voteCount += 1;
        hasVoted[challengeId][msg.sender] = true;

        emit Voted(challengeId, msg.sender, submissionIndex);
    }

    function distributePrize(
        uint256 challengeId
    ) public nonReentrant whenNotPaused {
        Challenge storage challenge = challenges[challengeId];
        require(
            block.timestamp >= challenge.startTime + challenge.duration,
            "Challenge is still active"
        );
        require(challenge.isActive, "No active challenge");

        uint256 highestVotes = 0;
        uint256 winningIndex = 0;
        Submission[] storage submissions = challengeSubmissions[challengeId];
        
        require(submissions.length > 0, "No submissions to distribute prize to");

        for (uint256 i = 0; i < submissions.length; i++) {
            if (submissions[i].voteCount > highestVotes) {
                highestVotes = submissions[i].voteCount;
                winningIndex = i;
            }
        }

        require(highestVotes > 0, "No votes cast");

        challenge.winner = payable(submissions[winningIndex].submitter);
        challenge.isActive = false;

        if (challenge.prizeType == PrizeType.ETH) {
            challenge.winner.transfer(challenge.prizeAmount);
        } else {
            require(
                usdcToken.transfer(challenge.winner, challenge.prizeAmount),
                "USDC transfer failed"
            );
        }

        emit PrizeDistributed(
            challengeId,
            challenge.winner,
            challenge.prizeAmount,
            challenge.prizeType
        );
    }

    function checkUpkeep(
        bytes calldata
    )
        external
        view
        override
        returns (bool upkeepNeeded, bytes memory performData)
    {
        for (uint256 i = 0; i < nextChallengeId; i++) {
            Challenge storage challenge = challenges[i];
            if (
                block.timestamp >= challenge.startTime + challenge.duration &&
                challenge.isActive
            ) {
                return (true, abi.encode(i));
            }
        }
        return (false, bytes(""));
    }

    function performUpkeep(bytes calldata performData) external override {
        uint256 challengeId = abi.decode(performData, (uint256));
        if (
            (block.timestamp >=
                challenges[challengeId].startTime +
                    challenges[challengeId].duration) &&
            challenges[challengeId].isActive
        ) {
            distributePrize(challengeId);
        }
    }

    function getActiveChallenges() public view returns (uint256[] memory) {
        uint256 activeCount = 0;
        for (uint256 i = 0; i < nextChallengeId; i++) {
            if (challenges[i].isActive) {
                activeCount++;
            }
        }

        uint256[] memory activeChallenges = new uint256[](activeCount);
        uint256 currentIndex = 0;
        for (uint256 i = 0; i < nextChallengeId; i++) {
            if (challenges[i].isActive) {
                activeChallenges[currentIndex] = i;
                currentIndex++;
            }
        }

        return activeChallenges;
    }

    function getCompletedChallenges() public view returns (uint256[] memory) {
        uint256 completedCount = 0;
        for (uint256 i = 0; i < nextChallengeId; i++) {
            if (!challenges[i].isActive) {
                completedCount++;
            }
        }

        uint256[] memory completedChallenges = new uint256[](completedCount);
        uint256 currentIndex = 0;
        for (uint256 i = 0; i < nextChallengeId; i++) {
            if (!challenges[i].isActive) {
                completedChallenges[currentIndex] = i;
                currentIndex++;
            }
        }

        return completedChallenges;
    }

    function getChallengeDetails(
        uint256 challengeId
    )
        public
        view
        returns (
            string memory,
            uint256,
            uint256,
            bool,
            address,
            uint256,
            PrizeType
        )
    {
        Challenge memory challenge = challenges[challengeId];
        return (
            challenge.ipfsUrl,
            challenge.duration,
            challenge.startTime,
            challenge.isActive,
            challenge.winner,
            challenge.prizeAmount,
            challenge.prizeType
        );
    }

    function getSubmission(
        uint256 challengeId,
        uint256 submissionIndex
    ) public view returns (string memory, address, uint256) {
        require(
            submissionIndex < challengeSubmissions[challengeId].length,
            "Submission index out of range"
        );
        Submission storage submission = challengeSubmissions[challengeId][
            submissionIndex
        ];
        return (
            submission.ipfsHash,
            submission.submitter,
            submission.voteCount
        );
    }

    function getNumberOfSubmissions(
        uint256 challengeId
    ) public view returns (uint256) {
        return challengeSubmissions[challengeId].length;
    }

    function hasUserVotedInChallenge(
        uint256 challengeId,
        address user
    ) public view returns (bool) {
        return hasVoted[challengeId][user];
    }

    function emergencyWithdrawETH() public onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    function emergencyWithdrawUSDC() public onlyOwner {
        uint256 balance = usdcToken.balanceOf(address(this));
        require(usdcToken.transfer(owner(), balance), "USDC transfer failed");
    }

    function getTotalNumberOfChallenges() public view returns (uint256) {
        return nextChallengeId;
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }
}