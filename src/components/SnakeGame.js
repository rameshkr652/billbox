import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');
const GRID_SIZE = 20;
const CELL_SIZE = Math.floor(width / GRID_SIZE);
const GAME_HEIGHT = Math.floor(height * 0.6 / CELL_SIZE) * CELL_SIZE;

// Array of food emojis for random selection
const FOOD_EMOJIS = ['🍎', '🍌', '🍒', '🍓', '🍊', '🍇', '🍉', '🍑', '🍍', '🍕', '🍔', '🍩', '🍫', '🍬'];

const SnakeGame = () => {
  const [snake, setSnake] = useState([{ x: 5, y: 5 }]);
  const [food, setFood] = useState({ x: 10, y: 10, emoji: getRandomFoodEmoji() });
  const [direction, setDirection] = useState('RIGHT');
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [gameSpeed, setGameSpeed] = useState(180); // Slightly faster initial speed
  const [isEating, setIsEating] = useState(false); // State to track eating animation

  function getRandomFoodEmoji() {
    return FOOD_EMOJIS[Math.floor(Math.random() * FOOD_EMOJIS.length)];
  }

  // Updated function to determine snake segment appearance
  const getSnakeSegmentStyle = (index, segment, nextSegment, prevSegment) => {
    const baseStyle = {
      width: CELL_SIZE,
      height: CELL_SIZE,
      backgroundColor: index === 0 ? '#FFFF00' : '#00FF00', // Yellow head, green body
      borderRadius: CELL_SIZE / 2, // Rounded corners for all segments
      position: 'absolute',
      left: segment.x * CELL_SIZE,
      top: segment.y * CELL_SIZE,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: index === 0 ? '#888800' : '#008800',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.7,
      shadowRadius: 5,
      elevation: 5,
      borderWidth: 1,
      borderColor: index === 0 ? '#CCCC00' : '#00CC00',
    };

    // Additional styling for the head with snake face
    if (index === 0) {
      // Position eyes based on direction
      let eyePositions = [];
      let mouthStyle = {};
      
      switch (direction) {
        case 'UP':
          eyePositions = [
            { left: CELL_SIZE / 4, top: CELL_SIZE / 4 },
            { right: CELL_SIZE / 4, top: CELL_SIZE / 4 }
          ];
          // Mouth at the top
          mouthStyle = {
            top: isEating ? CELL_SIZE / 8 : CELL_SIZE / 6,
            left: '35%',
            width: CELL_SIZE / 3,
            height: isEating ? CELL_SIZE / 3 : CELL_SIZE / 10,
            borderBottomLeftRadius: CELL_SIZE / 3,
            borderBottomRightRadius: CELL_SIZE / 3,
            backgroundColor: '#FF3333',
          };
          break;
        case 'DOWN':
          eyePositions = [
            { left: CELL_SIZE / 4, bottom: CELL_SIZE / 4 },
            { right: CELL_SIZE / 4, bottom: CELL_SIZE / 4 }
          ];
          // Mouth at the bottom
          mouthStyle = {
            bottom: isEating ? CELL_SIZE / 8 : CELL_SIZE / 6,
            left: '35%',
            width: CELL_SIZE / 3,
            height: isEating ? CELL_SIZE / 3 : CELL_SIZE / 10,
            borderTopLeftRadius: CELL_SIZE / 3,
            borderTopRightRadius: CELL_SIZE / 3,
            backgroundColor: '#FF3333',
          };
          break;
        case 'LEFT':
          eyePositions = [
            { left: CELL_SIZE / 4, top: CELL_SIZE / 4 },
            { left: CELL_SIZE / 4, bottom: CELL_SIZE / 4 }
          ];
          // Mouth at the left
          mouthStyle = {
            left: isEating ? CELL_SIZE / 8 : CELL_SIZE / 6,
            top: '35%',
            height: CELL_SIZE / 3,
            width: isEating ? CELL_SIZE / 3 : CELL_SIZE / 10,
            borderTopRightRadius: CELL_SIZE / 3,
            borderBottomRightRadius: CELL_SIZE / 3,
            backgroundColor: '#FF3333',
          };
          break;
        case 'RIGHT':
          eyePositions = [
            { right: CELL_SIZE / 4, top: CELL_SIZE / 4 },
            { right: CELL_SIZE / 4, bottom: CELL_SIZE / 4 }
          ];
          // Mouth at the right
          mouthStyle = {
            right: isEating ? CELL_SIZE / 8 : CELL_SIZE / 6,
            top: '35%',
            height: CELL_SIZE / 3,
            width: isEating ? CELL_SIZE / 3 : CELL_SIZE / 10,
            borderTopLeftRadius: CELL_SIZE / 3,
            borderBottomLeftRadius: CELL_SIZE / 3,
            backgroundColor: '#FF3333',
          };
          break;
      }

      return {
        baseStyle,
        eyePositions,
        mouthStyle
      };
    }

    return { baseStyle };
  };

  useEffect(() => {
    if (!gameOver && !isPaused) {
      const gameLoop = setInterval(moveSnake, gameSpeed);
      return () => clearInterval(gameLoop);
    }
  }, [snake, direction, gameOver, isPaused, gameSpeed]);

  // Increase speed as score increases
  useEffect(() => {
    if (score > 0 && score % 5 === 0 && gameSpeed > 80) {
      setGameSpeed(prevSpeed => Math.max(prevSpeed - 10, 80));
    }
  }, [score]);

  const moveSnake = () => {
    const newSnake = [...snake];
    const head = { ...newSnake[0] };

    switch (direction) {
      case 'UP': head.y -= 1; break;
      case 'DOWN': head.y += 1; break;
      case 'LEFT': head.x -= 1; break;
      case 'RIGHT': head.x += 1; break;
    }

    // Wrap around the screen (no wall collision)
    if (head.x < 0) head.x = GRID_SIZE - 1;
    if (head.x >= GRID_SIZE) head.x = 0;
    if (head.y < 0) head.y = Math.floor(GAME_HEIGHT / CELL_SIZE) - 1;
    if (head.y >= Math.floor(GAME_HEIGHT / CELL_SIZE)) head.y = 0;

    // Check self-collision
    if (newSnake.some(segment => segment.x === head.x && segment.y === head.y)) {
      setGameOver(true);
      return;
    }

    newSnake.unshift(head);

    // Check food collision
    if (head.x === food.x && head.y === food.y) {
      setScore(score + 1);
      
      // Trigger eating animation
      setIsEating(true);
      setTimeout(() => {
        setIsEating(false);
      }, 300); // Animation duration
      
      generateFood(newSnake);
    } else {
      newSnake.pop();
    }

    setSnake(newSnake);
  };

  const generateFood = (currentSnake = snake) => {
    let newFood;
    let validPosition = false;
    
    // Ensure food doesn't appear on snake
    while (!validPosition) {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * (GAME_HEIGHT / CELL_SIZE)),
        emoji: getRandomFoodEmoji(),
      };
      
      validPosition = !currentSnake.some(
        segment => segment.x === newFood.x && segment.y === newFood.y
      );
    }
    
    setFood(newFood);
  };

  const changeDirection = (newDirection) => {
    if (
      (direction === 'UP' && newDirection !== 'DOWN') ||
      (direction === 'DOWN' && newDirection !== 'UP') ||
      (direction === 'LEFT' && newDirection !== 'RIGHT') ||
      (direction === 'RIGHT' && newDirection !== 'LEFT')
    ) {
      setDirection(newDirection);
    }
  };

  const resetGame = () => {
    setSnake([{ x: 5, y: 5 }]);
    setDirection('RIGHT');
    setGameOver(false);
    setScore(0);
    setIsPaused(false);
    setGameSpeed(180); // Reset speed
    setIsEating(false); // Reset eating state
    generateFood();
  };

  const togglePause = () => {
    setIsPaused(!isPaused);
  };

  return (
    <View style={styles.container}>
      <View style={styles.gameContainer}>
        {/* Score Display */}
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreText}>SCORE</Text>
          <Text style={styles.scoreValue}>{score.toString().padStart(3, '0')}</Text>
        </View>

        {/* Game Board */}
        <View style={styles.grid}>
          {/* Render snake as rounded segments with face */}
          {snake.map((segment, index) => {
            const prevSegment = index > 0 ? snake[index - 1] : null;
            const nextSegment = index < snake.length - 1 ? snake[index + 1] : null;
            const segmentStyle = getSnakeSegmentStyle(index, segment, nextSegment, prevSegment);
            
            return (
              <View key={index}>
                <View style={segmentStyle.baseStyle}>
                  {index === 0 && segmentStyle.eyePositions.map((eyePos, eyeIdx) => (
                    <View key={eyeIdx} style={[styles.snakeEye, eyePos]} />
                  ))}
                  {/* Mouth for the head */}
                  {index === 0 && segmentStyle.mouthStyle && (
                    <View style={[styles.snakeMouth, segmentStyle.mouthStyle]} />
                  )}
                  {/* Flicking tongue for head */}
                  {index === 0 && !isEating && direction === 'RIGHT' && (
                    <View style={styles.tongueLine}>
                      <View style={styles.tonguePoint} />
                    </View>
                  )}
                </View>
              </View>
            );
          })}
          
          {/* Food as emoji */}
          <View
            style={[
              styles.food,
              {
                left: food.x * CELL_SIZE,
                top: food.y * CELL_SIZE,
              },
            ]}
          >
            <Text style={styles.foodEmoji}>{food.emoji}</Text>
          </View>
        </View>

        {/* Game Over Overlay */}
        {gameOver && (
          <View style={styles.gameOverContainer}>
            <Text style={styles.gameOverText}>GAME OVER</Text>
            <Text style={styles.finalScore}>SCORE: {score}</Text>
            <TouchableOpacity 
              style={styles.restartButton} 
              onPress={resetGame}
              activeOpacity={0.7}
            >
              <Text style={styles.buttonText}>PLAY AGAIN</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Pause Overlay */}
        {isPaused && !gameOver && (
          <View style={styles.pauseContainer}>
            <Text style={styles.pauseText}>PAUSED</Text>
            <TouchableOpacity 
              style={styles.resumeButton} 
              onPress={togglePause}
              activeOpacity={0.7}
            >
              <Text style={styles.buttonText}>RESUME</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity 
          style={[styles.controlButton, styles.topButton]} 
          onPress={() => changeDirection('UP')}
          activeOpacity={0.7}
        >
          <Text style={styles.controlText}>↑</Text>
        </TouchableOpacity>
        <View style={styles.horizontalControls}>
          <TouchableOpacity 
            style={[styles.controlButton, styles.leftButton]} 
            onPress={() => changeDirection('LEFT')}
            activeOpacity={0.7}
          >
            <Text style={styles.controlText}>←</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.controlButton, styles.pauseButton]} 
            onPress={togglePause}
            activeOpacity={0.7}
          >
            <Text style={styles.controlText}>{isPaused ? '▶' : '⏸'}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.controlButton, styles.rightButton]} 
            onPress={() => changeDirection('RIGHT')}
            activeOpacity={0.7}
          >
            <Text style={styles.controlText}>→</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity 
          style={[styles.controlButton, styles.bottomButton]} 
          onPress={() => changeDirection('DOWN')}
          activeOpacity={0.7}
        >
          <Text style={styles.controlText}>↓</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E1E2E', // Dark theme background
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20,
  },
  snakeMouth: {
    position: 'absolute',
    backgroundColor: '#FF3333', // Red mouth
  },
  gameContainer: {
    width: GRID_SIZE * CELL_SIZE,
    height: GAME_HEIGHT,
    backgroundColor: '#0A0A1A', // Darker background for game area
    borderWidth: 3,
    borderColor: '#89CFF0', // Light blue border
    borderRadius: 15,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#89CFF0',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 10,
    elevation: 10,
  },
  grid: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  snakeEye: {
    width: CELL_SIZE / 5,
    height: CELL_SIZE / 5,
    backgroundColor: '#000000',
    borderRadius: CELL_SIZE / 5,
    position: 'absolute',
  },
  tongueLine: {
    position: 'absolute',
    right: -CELL_SIZE / 3,
    height: 2,
    width: CELL_SIZE / 3,
    backgroundColor: '#FF0000',
  },
  tonguePoint: {
    position: 'absolute',
    right: -3,
    top: -3,
    height: 8,
    width: 8,
    backgroundColor: '#FF0000',
    borderRadius: 4,
  },
  food: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  foodEmoji: {
    fontSize: CELL_SIZE - 2,
    lineHeight: CELL_SIZE,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.5)', // Shadow for food
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  scoreContainer: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.6)', // More opaque
    padding: 8,
    borderRadius: 8,
    zIndex: 10,
    borderWidth: 1,
    borderColor: '#89CFF0',
  },
  scoreText: {
    fontSize: 12,
    color: '#89CFF0',
    textAlign: 'center',
    fontWeight: 'bold',
    letterSpacing: 1, // Improved spacing
  },
  scoreValue: {
    fontSize: 20, // Larger size
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    textShadowColor: '#89CFF0', // Light blue glow
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  gameOverContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.9)', // Darker overlay
    justifyContent: 'center',
    alignItems: 'center',
    backdropFilter: 'blur(4px)', // Enhanced blur
  },
  gameOverText: {
    fontSize: 36, // Larger text
    fontWeight: 'bold',
    color: '#FF3333',
    marginBottom: 20,
    textShadowColor: '#000',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 5,
    letterSpacing: 2, // Improved spacing
  },
  finalScore: {
    fontSize: 28, // Larger text
    color: '#FFFFFF',
    marginBottom: 30,
    fontWeight: 'bold',
    textShadowColor: '#89CFF0', // Light blue glow
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  restartButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 15, // Larger button
    paddingHorizontal: 30,
    borderRadius: 30,
    shadowColor: '#00FF00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#2E7D32',
  },
  pauseContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.8)', // Darker overlay
    justifyContent: 'center',
    alignItems: 'center',
    backdropFilter: 'blur(3px)', // Enhanced blur
  },
  pauseText: {
    fontSize: 36, // Larger text
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 30,
    textShadowColor: '#000',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 5,
    letterSpacing: 2, // Improved spacing
  },
  resumeButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 15, // Larger button
    paddingHorizontal: 30,
    borderRadius: 30,
    shadowColor: '#89CFF0',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#0D47A1',
  },
  controls: {
    alignItems: 'center',
    marginTop: 0,
    width: '70%',
  },
  horizontalControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginVertical: 10,
  },
  controlButton: {
    width: 85, // Slightly larger
    height: 85, // Slightly larger
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 35, // Rounded corners
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.6, // More prominent shadow
    shadowRadius: 6,
    elevation: 10,
    borderWidth: 2, // Added border
  },
  topButton: {
    backgroundColor: '#9932CC', // Darker purple
    shadowColor: '#9370DB',
    borderColor: '#7B1FA2',
  },
  leftButton: {
    backgroundColor: '#9932CC', // Darker purple
    shadowColor: '#9370DB',
    borderColor: '#7B1FA2',
  },
  rightButton: {
    backgroundColor: '#9932CC', // Darker purple
    shadowColor: '#9370DB',
    borderColor: '#7B1FA2',
  },
  bottomButton: {
    backgroundColor: '#9932CC', // Darker purple
    shadowColor: '#9370DB',
    borderColor: '#7B1FA2',
  },
  pauseButton: {
    backgroundColor: '#FF9800', // Orange
    shadowColor: '#FFA500',
    borderColor: '#E65100',
  },
  controlText: {
    color: '#FFFFFF',
    fontSize: 30, // Larger text
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.5)', // Text shadow
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18, // Larger text
    fontWeight: 'bold',
    letterSpacing: 1, // Improved spacing
  },
});

export default SnakeGame;