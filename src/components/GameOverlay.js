import React from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    Modal, 
    TouchableOpacity
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const GameOverlay = ({ showGameModal, isGameMinimized, handleMinimizeGame, handleCloseGame }) => {
    return (
        showGameModal && (
            <Modal
                transparent
                visible={!isGameMinimized}
                animationType="slide"
                onRequestClose={handleMinimizeGame}
            >
                <View style={styles.gameModalContainer}>
                    <View style={styles.gameModalHeader}>
                        <Text style={styles.gameModalTitle}>Game Time!</Text>
                        <View style={styles.gameModalControls}>
                            <TouchableOpacity 
                                style={styles.gameModalButton}
                                onPress={handleMinimizeGame}
                            >
                                <Icon name="minimize" size={24} color="#FFFFFF" />
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={styles.gameModalButton}
                                onPress={handleCloseGame}
                            >
                                <Icon name="close" size={24} color="#FFFFFF" />
                            </TouchableOpacity>
                        </View>
                    </View>
                    <View style={styles.gameContainer}>
                        <Text style={styles.gameComingSoonText}>Game loading...</Text>
                    </View>
                </View>
            </Modal>
        )
    );
};

const styles = StyleSheet.create({
    gameModalContainer: {
        flex: 1,
        backgroundColor: '#121212',
    },
    gameModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#222222',
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#333333',
    },
    gameModalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    gameModalControls: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    gameModalButton: {
        padding: 8,
        marginLeft: 16,
    },
    gameContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    gameComingSoonText: {
        fontSize: 18,
        color: '#FFFFFF',
        textAlign: 'center',
    },
});

export default GameOverlay;