// src/components/BankTransactionsDisplay.js
import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Animated, 
  Dimensions,
  TextInput,
  ScrollView,
  RefreshControl,
  Share
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Colors from '../constants/colors';
import { format } from 'date-fns';

const { width } = Dimensions.get('window');
const BAR_WIDTH = width - 120;

const BankTransactionsDisplay = ({ 
  transactions, 
  bankColor = '#3498db', 
  onRefresh, 
  isRefreshing = false 
}) => {
  // State for transactions data
  const [creditTransactions, setCreditTransactions] = useState([]);
  const [debitTransactions, setDebitTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState({
    credits: [],
    debits: []
  });
  
  // UI state
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [barWidths] = useState({
    credit: new Animated.Value(0),
    debit: new Animated.Value(0),
  });
  const [summaryData, setSummaryData] = useState({
    totalCredit: 0,
    totalDebit: 0,
    netBalance: 0,
    topDebits: [],
    topCredits: [],
    categorizedExpenses: {},
    monthlyTrends: []
  });
  
  // Transaction categories with keywords for classification
  const transactionCategories = {
    'SHOPPING': ['amazon', 'flipkart', 'myntra', 'ajio', 'retail', 'store', 'mall', 'market', 'purchase'],
    'FOOD': ['swiggy', 'zomato', 'restaurant', 'cafe', 'food', 'dining', 'eat', 'dinner', 'lunch', 'breakfast'],
    'TRAVEL': ['uber', 'ola', 'cab', 'taxi', 'bus', 'train', 'flight', 'travel', 'trip', 'tour', 'hotel'],
    'BILLS': ['bill', 'recharge', 'electricity', 'water', 'gas', 'broadband', 'internet', 'wifi', 'subscription'],
    'SALARY': ['salary', 'income', 'payroll', 'stipend', 'wage', 'pay', 'earning'],
    'TRANSFER': ['transfer', 'sent', 'received', 'upi', 'neft', 'rtgs', 'imps', 'fund'],
    'ENTERTAINMENT': ['movie', 'netflix', 'amazon prime', 'hotstar', 'ott', 'theatre', 'cinema'],
    'EDUCATION': ['school', 'college', 'course', 'class', 'tuition', 'education', 'learning', 'university', 'fees'],
    'HEALTHCARE': ['hospital', 'doctor', 'medical', 'health', 'medicine', 'pharmacy', 'clinic', 'consultation'],
    'OTHER': [] // Default category
  };

  // Process transactions whenever we receive new data
  useEffect(() => {
    processTransactions();
  }, [transactions]);

  // Update filtered transactions when search query or transaction data changes
  useEffect(() => {
    filterTransactions();
  }, [searchQuery, creditTransactions, debitTransactions]);

  // Handle search filtering
  const filterTransactions = useCallback(() => {
    if (searchQuery.trim() === '') {
      setFilteredTransactions({
        credits: creditTransactions,
        debits: debitTransactions
      });
      return;
    }
    
    const query = searchQuery.toLowerCase();
    
    const filteredCredits = creditTransactions.filter(tx => 
      (tx.sender && tx.sender.toLowerCase().includes(query)) ||
      (tx.description && tx.description.toLowerCase().includes(query)) ||
      (tx.category && tx.category.toLowerCase().includes(query))
    );
    
    const filteredDebits = debitTransactions.filter(tx => 
      (tx.recipient && tx.recipient.toLowerCase().includes(query)) ||
      (tx.description && tx.description.toLowerCase().includes(query)) ||
      (tx.category && tx.category.toLowerCase().includes(query))
    );
    
    setFilteredTransactions({
      credits: filteredCredits,
      debits: filteredDebits
    });
  }, [searchQuery, creditTransactions, debitTransactions]);

  // Identify transaction category based on transaction info
  const identifyCategory = (transaction) => {
    const textToCheck = transaction.type === 'credit' 
      ? (transaction.sender || '').toLowerCase() 
      : (transaction.recipient || '').toLowerCase();
    
    const description = (transaction.description || '').toLowerCase();
    
    // Check each category's keywords
    for (const [category, keywords] of Object.entries(transactionCategories)) {
      if (keywords.some(keyword => 
        textToCheck.includes(keyword) || description.includes(keyword)
      )) {
        return category;
      }
    }
    
    return 'OTHER';
  };

  // Process the raw transaction data into organized structures
  const processTransactions = useCallback(() => {
    if (!transactions || transactions.length === 0) return;

    // Initialize arrays and counters
    const credits = [];
    const debits = [];
    let totalCreditAmount = 0;
    let totalDebitAmount = 0;
    const categorizedExpenses = {};
    const monthlyData = {}; // To track monthly spending trends

    // Process each transaction
    transactions.forEach(transaction => {
      // Get transaction date
      const txDate = transaction.date ? new Date(transaction.date) : new Date();
      const formattedDate = formatDate(txDate);
      const monthKey = format(txDate, 'yyyy-MM');
      
      // Initialize monthly tracking if needed
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: format(txDate, 'MMM yyyy'),
          credits: 0,
          debits: 0,
          categories: {}
        };
      }
      
      // Process credit transactions
      if (transaction.creditTransactions && transaction.creditTransactions.length > 0) {
        transaction.creditTransactions.forEach(credit => {
          // Add metadata and category to credit transaction
          const category = identifyCategory({...credit, type: 'credit'});
          
          const enhancedCredit = {
            ...credit,
            id: `${transaction.id}-credit-${Math.random().toString(36).substring(2, 10)}`,
            date: txDate,
            formattedDate,
            category,
            description: credit.description || generateDescription(credit.sender, 'credit')
          };
          
          credits.push(enhancedCredit);
          totalCreditAmount += credit.amount || 0;
          
          // Update monthly data
          monthlyData[monthKey].credits += credit.amount || 0;
          
          // Categorize for analytics
          if (!categorizedExpenses[category]) {
            categorizedExpenses[category] = { creditTotal: 0, debitTotal: 0 };
          }
          categorizedExpenses[category].creditTotal += credit.amount || 0;
        });
      }

      // Process debit transactions
      if (transaction.debitTransactions && transaction.debitTransactions.length > 0) {
        transaction.debitTransactions.forEach(debit => {
          // Add metadata and category
          const category = identifyCategory({...debit, type: 'debit'});
          
          const enhancedDebit = {
            ...debit,
            id: `${transaction.id}-debit-${Math.random().toString(36).substring(2, 10)}`,
            date: txDate,
            formattedDate,
            category,
            description: debit.description || generateDescription(debit.recipient, 'debit')
          };
          
          debits.push(enhancedDebit);
          totalDebitAmount += debit.amount || 0;
          
          // Update monthly data
          monthlyData[monthKey].debits += debit.amount || 0;
          
          // Update category data for monthly trend
          if (!monthlyData[monthKey].categories[category]) {
            monthlyData[monthKey].categories[category] = 0;
          }
          monthlyData[monthKey].categories[category] += debit.amount || 0;
          
          // Categorize for overall analytics
          if (!categorizedExpenses[category]) {
            categorizedExpenses[category] = { creditTotal: 0, debitTotal: 0 };
          }
          categorizedExpenses[category].debitTotal += debit.amount || 0;
        });
      }
    });

    // Sort transactions by date (newest first)
    credits.sort((a, b) => new Date(b.date) - new Date(a.date));
    debits.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Top transactions by amount
    const topCredits = [...credits].sort((a, b) => b.amount - a.amount).slice(0, 5);
    const topDebits = [...debits].sort((a, b) => b.amount - a.amount).slice(0, 5);
    
    // Convert monthly data to array and sort by date
    const monthlyTrends = Object.values(monthlyData).sort((a, b) => {
      return new Date(b.month) - new Date(a.month);
    });

    // Update component state
    setCreditTransactions(credits);
    setDebitTransactions(debits);
    setFilteredTransactions({
      credits,
      debits
    });
    
    setSummaryData({
      totalCredit: totalCreditAmount,
      totalDebit: totalDebitAmount,
      netBalance: totalCreditAmount - totalDebitAmount,
      topCredits,
      topDebits,
      categorizedExpenses,
      monthlyTrends
    });

    // Animate the summary bars
    animateBars(totalCreditAmount, totalDebitAmount);
  }, [transactions]);

  // Generate description when none is provided
  const generateDescription = (partyName, type) => {
    if (!partyName) return type === 'credit' ? 'Received payment' : 'Payment made';
    
    if (type === 'credit') {
      return `Received from ${partyName}`;
    } else {
      return `Payment to ${partyName}`;
    }
  };

  // Animate the credit/debit bar visualization
  const animateBars = (creditAmount, debitAmount) => {
    const total = creditAmount + debitAmount;
    if (total === 0) return;

    Animated.parallel([
      Animated.timing(barWidths.credit, {
        toValue: (creditAmount / total) * BAR_WIDTH,
        duration: 800,
        useNativeDriver: false
      }),
      Animated.timing(barWidths.debit, {
        toValue: (debitAmount / total) * BAR_WIDTH,
        duration: 800,
        useNativeDriver: false
      })
    ]).start();
  };

  // Format currency for display
  const formatCurrency = (amount) => {
    return `₹${amount.toLocaleString('en-IN', {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2
    })}`;
  };

  // Format date for display
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return 'Unknown date';
    }
  };

  // Get icon for transaction category
  const getCategoryIcon = (category) => {
    switch (category) {
      case 'SHOPPING': return 'shopping-bag';
      case 'FOOD': return 'restaurant';
      case 'TRAVEL': return 'directions-car';
      case 'BILLS': return 'receipt';
      case 'SALARY': return 'work';
      case 'TRANSFER': return 'swap-horiz';
      case 'ENTERTAINMENT': return 'movie';
      case 'EDUCATION': return 'school';
      case 'HEALTHCARE': return 'medical-services';
      default: return 'payment';
    }
  };

  // Get color for transaction category
  const getCategoryColor = (category, opacity = 1) => {
    const colors = {
      'SHOPPING': `rgba(156, 39, 176, ${opacity})`,
      'FOOD': `rgba(255, 152, 0, ${opacity})`,
      'TRAVEL': `rgba(33, 150, 243, ${opacity})`,
      'BILLS': `rgba(0, 150, 136, ${opacity})`,
      'SALARY': `rgba(76, 175, 80, ${opacity})`,
      'TRANSFER': `rgba(63, 81, 181, ${opacity})`,
      'ENTERTAINMENT': `rgba(233, 30, 99, ${opacity})`,
      'EDUCATION': `rgba(3, 169, 244, ${opacity})`,
      'HEALTHCARE': `rgba(0, 188, 212, ${opacity})`,
      'OTHER': `rgba(96, 125, 139, ${opacity})`
    };
    
    return colors[category] || `rgba(96, 125, 139, ${opacity})`;
  };

  // Share transaction summary
  const shareTransactionSummary = async () => {
    try {
      const message = `
Transaction Summary:
------------------
Total Credits: ${formatCurrency(summaryData.totalCredit)}
Total Debits: ${formatCurrency(summaryData.totalDebit)}
Net Balance: ${formatCurrency(Math.abs(summaryData.netBalance))} ${summaryData.netBalance >= 0 ? 'CR' : 'DR'}

Top Categories:
${Object.entries(summaryData.categorizedExpenses)
  .filter(([_, data]) => data.debitTotal > 0)
  .sort(([_, dataA], [__, dataB]) => dataB.debitTotal - dataA.debitTotal)
  .slice(0, 3)
  .map(([category, data]) => `- ${category}: ${formatCurrency(data.debitTotal)}`)
  .join('\n')}

Generated with BillBox App
      `;
      
      await Share.share({
        message,
        title: 'My Transaction Summary'
      });
    } catch (error) {
      console.error('Error sharing transaction summary:', error);
    }
  };

  // Render credit transaction item
  const renderCreditItem = ({ item }) => (
    <TouchableOpacity style={styles.transactionItem}>
      <View style={styles.transactionHeader}>
        <View style={[
          styles.transactionIcon,
          { backgroundColor: item.category ? getCategoryColor(item.category, 0.1) : 'rgba(76, 175, 80, 0.1)' }
        ]}>
          <Icon 
            name={item.category ? getCategoryIcon(item.category) : "arrow-downward"} 
            size={18} 
            color={item.category ? getCategoryColor(item.category, 1) : "#4CAF50"} 
          />
        </View>
        <View style={styles.transactionInfo}>
          <Text style={styles.transactionSender}>{item.sender || 'Unknown'}</Text>
          {item.description && (
            <Text style={styles.transactionDescription}>{item.description}</Text>
          )}
          <View style={styles.transactionMeta}>
            <Text style={styles.transactionDate}>{item.formattedDate}</Text>
            {item.category && (
              <View style={[styles.categoryTag, { backgroundColor: getCategoryColor(item.category, 0.1) }]}>
                <Text style={[styles.categoryText, { color: getCategoryColor(item.category, 1) }]}>
                  {item.category}
                </Text>
              </View>
            )}
          </View>
        </View>
        <Text style={styles.creditAmount}>+{formatCurrency(item.amount)}</Text>
      </View>
    </TouchableOpacity>
  );

  // Render debit transaction item
  const renderDebitItem = ({ item }) => (
    <TouchableOpacity style={styles.transactionItem}>
      <View style={styles.transactionHeader}>
        <View style={[
          styles.transactionIcon, 
          { backgroundColor: item.category ? getCategoryColor(item.category, 0.1) : 'rgba(244, 67, 54, 0.1)' }
        ]}>
          <Icon 
            name={item.category ? getCategoryIcon(item.category) : "arrow-upward"} 
            size={18} 
            color={item.category ? getCategoryColor(item.category, 1) : "#F44336"} 
          />
        </View>
        <View style={styles.transactionInfo}>
          <Text style={styles.transactionRecipient}>{item.recipient || 'Unknown'}</Text>
          {item.description && (
            <Text style={styles.transactionDescription}>{item.description}</Text>
          )}
          <View style={styles.transactionMeta}>
            <Text style={styles.transactionDate}>{item.formattedDate}</Text>
            {item.category && (
              <View style={[styles.categoryTag, { backgroundColor: getCategoryColor(item.category, 0.1) }]}>
                <Text style={[styles.categoryText, { color: getCategoryColor(item.category, 1) }]}>
                  {item.category}
                </Text>
              </View>
            )}
          </View>
        </View>
        <Text style={styles.debitAmount}>-{formatCurrency(item.amount)}</Text>
      </View>
    </TouchableOpacity>
  );

  // Render all transactions tab content
  const renderAllTransactions = () => {
    // Combine and sort all transactions by date
    const allTransactions = [
      ...filteredTransactions.credits.map(t => ({ ...t, transactionType: 'credit' })),
      ...filteredTransactions.debits.map(t => ({ ...t, transactionType: 'debit' }))
    ];

    allTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    return (
      <FlatList
        data={allTransactions}
        keyExtractor={item => item.id}
        renderItem={({ item }) => 
          item.transactionType === 'credit' 
            ? renderCreditItem({ item }) 
            : renderDebitItem({ item })
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No transactions found</Text>
          </View>
        }
        refreshControl={
          <RefreshControl 
            refreshing={isRefreshing} 
            onRefresh={onRefresh}
            colors={[bankColor]} 
          />
        }
      />
    );
  };

  // Render category expense breakdown
  const renderCategoryBreakdown = () => {
    const totalDebit = summaryData.totalDebit || 0;
    
    // Sort categories by amount spent (highest first)
    const sortedCategories = Object.entries(summaryData.categorizedExpenses || {})
      .filter(([_, data]) => data.debitTotal > 0)
      .sort(([_, dataA], [__, dataB]) => dataB.debitTotal - dataA.debitTotal);
    
    return (
      <ScrollView 
        style={styles.categoryBreakdown}
        refreshControl={
          <RefreshControl 
            refreshing={isRefreshing} 
            onRefresh={onRefresh}
            colors={[bankColor]} 
          />
        }
      >
        <Text style={styles.categoryBreakdownTitle}>Expense Breakdown</Text>
        
        {sortedCategories.length > 0 ? (
          <>
            {sortedCategories.map(([category, data]) => {
              const percentage = totalDebit > 0 
                ? Math.round((data.debitTotal / totalDebit) * 100)
                : 0;
              
              return (
                <View key={category} style={styles.categoryBreakdownItem}>
                  <View style={styles.categoryBreakdownHeader}>
                    <View style={styles.categoryBreakdownNameSection}>
                      <View style={[
                        styles.categoryIcon,
                        { backgroundColor: getCategoryColor(category, 0.1) }
                      ]}>
                        <Icon 
                          name={getCategoryIcon(category)} 
                          size={16} 
                          color={getCategoryColor(category)} 
                        />
                      </View>
                      <Text style={styles.categoryBreakdownName}>{category}</Text>
                    </View>
                    <View style={styles.categoryBreakdownValues}>
                      <Text style={styles.categoryBreakdownPercentage}>{percentage}%</Text>
                      <Text style={styles.categoryBreakdownAmount}>{formatCurrency(data.debitTotal)}</Text>
                    </View>
                  </View>
                  <View style={styles.categoryBreakdownBarContainer}>
                    <View style={styles.categoryBreakdownBarBg}>
                      <View 
                        style={[
                          styles.categoryBreakdownBar,
                          { 
                            width: `${percentage}%`,
                            backgroundColor: getCategoryColor(category)
                          }
                        ]} 
                      />
                    </View>
                  </View>
                </View>
              );
            })}
            
            {/* Monthly spending trends section */}
            {summaryData.monthlyTrends && summaryData.monthlyTrends.length > 0 && (
              <View style={styles.monthlyTrendsSection}>
                <Text style={styles.monthlyTrendsTitle}>Monthly Spending Trends</Text>
                
                {summaryData.monthlyTrends.map((monthData, index) => (
                  <View key={index} style={styles.monthlyTrendItem}>
                    <Text style={styles.monthlyTrendMonth}>{monthData.month}</Text>
                    
                    <View style={styles.monthlyTrendBars}>
                      <View style={styles.monthlyTrendBarContainer}>
                        <Text style={styles.monthlyTrendLabel}>Income</Text>
                        <View style={styles.monthlyTrendBarWrapper}>
                          <View 
                            style={[
                              styles.monthlyTrendBar,
                              { 
                                width: `${Math.min(100, Math.round((monthData.credits / (summaryData.totalCredit * 0.5)) * 100))}%`,
                                backgroundColor: '#4CAF50' 
                              }
                            ]} 
                          />
                        </View>
                        <Text style={[styles.monthlyTrendAmount, styles.creditValue]}>
                          {formatCurrency(monthData.credits)}
                        </Text>
                      </View>
                      
                      <View style={styles.monthlyTrendBarContainer}>
                        <Text style={styles.monthlyTrendLabel}>Expense</Text>
                        <View style={styles.monthlyTrendBarWrapper}>
                          <View 
                            style={[
                              styles.monthlyTrendBar,
                              { 
                                width: `${Math.min(100, Math.round((monthData.debits / (summaryData.totalDebit * 0.5)) * 100))}%`,
                                backgroundColor: '#F44336' 
                              }
                            ]} 
                          />
                        </View>
                        <Text style={[styles.monthlyTrendAmount, styles.debitValue]}>
                          {formatCurrency(monthData.debits)}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        ) : (
          <Text style={styles.noDataText}>No categorized expenses available</Text>
        )}
      </ScrollView>
    );
  };

  // Render spending insights
  const renderInsights = () => {
    return (
      <ScrollView 
        style={styles.insightsContainer}
        refreshControl={
          <RefreshControl 
            refreshing={isRefreshing} 
            onRefresh={onRefresh}
            colors={[bankColor]} 
          />
        }
      >
        <Text style={styles.insightsTitle}>Spending Insights</Text>
        
        {/* Spending Trend Card */}
        <View style={styles.insightCard}>
          <View style={styles.insightCardHeader}>
            <Icon name="trending-up" size={20} color={bankColor} />
            <Text style={styles.insightCardTitle}>Monthly Trend</Text>
          </View>
          
          {summaryData.monthlyTrends && summaryData.monthlyTrends.length > 1 ? (
            <View style={styles.trendInsight}>
              {summaryData.monthlyTrends.slice(0, 2).map((month, index) => (
                <View key={index} style={styles.trendMonth}>
                  <Text style={styles.trendMonthName}>{month.month}</Text>
                  <Text style={styles.trendDebitAmount}>{formatCurrency(month.debits)}</Text>
                </View>
              ))}
              
              {summaryData.monthlyTrends.length >= 2 && (
                <View style={styles.trendComparison}>
                  {summaryData.monthlyTrends[0].debits > summaryData.monthlyTrends[1].debits ? (
                    <>
                      <Icon name="arrow-upward" size={16} color="#F44336" />
                      <Text style={[styles.trendDelta, {color: '#F44336'}]}>
                        {Math.round(((summaryData.monthlyTrends[0].debits - summaryData.monthlyTrends[1].debits) / summaryData.monthlyTrends[1].debits) * 100)}% more spending
                      </Text>
                    </>
                  ) : (
                    <>
                      <Icon name="arrow-downward" size={16} color="#4CAF50" />
                      <Text style={[styles.trendDelta, {color: '#4CAF50'}]}>
                        {Math.round(((summaryData.monthlyTrends[1].debits - summaryData.monthlyTrends[0].debits) / summaryData.monthlyTrends[1].debits) * 100)}% less spending
                      </Text>
                    </>
                  )}
                </View>
              )}
            </View>
          ) : (
            <Text style={styles.noDataText}>Not enough data to show trends</Text>
          )}
        </View>
        
        {/* Top Spending Categories */}
        <View style={styles.insightCard}>
          <View style={styles.insightCardHeader}>
            <Icon name="pie-chart" size={20} color={bankColor} />
            <Text style={styles.insightCardTitle}>Top Spending Categories</Text>
          </View>
          
          {Object.entries(summaryData.categorizedExpenses || {})
            .filter(([_, data]) => data.debitTotal > 0)
            .sort(([_, dataA], [__, dataB]) => dataB.debitTotal - dataA.debitTotal)
            .slice(0, 3)
            .map(([category, data], index) => (
              <View key={index} style={styles.topCategoryItem}>
                <View style={styles.topCategoryHeader}>
                  <View style={[styles.topCategoryIcon, {backgroundColor: getCategoryColor(category, 0.1)}]}>
                    <Icon name={getCategoryIcon(category)} size={16} color={getCategoryColor(category)} />
                  </View>
                  <Text style={styles.topCategoryName}>{category}</Text>
                </View>
                <Text style={styles.topCategoryAmount}>{formatCurrency(data.debitTotal)}</Text>
              </View>
            ))}
        </View>
        
        {/* Savable Amount */}
        <View style={styles.insightCard}>
          <View style={styles.insightCardHeader}>
            <Icon name="savings" size={20} color={bankColor} />
            <Text style={styles.insightCardTitle}>Potential Savings</Text>
          </View>
          
          <View style={styles.savingsContainer}>
            <Text style={styles.savingsText}>
              Based on your spending patterns, you could save around 
              <Text style={styles.savingsAmount}> {formatCurrency(Math.round(summaryData.totalDebit * 0.15))} </Text>
              by reducing discretionary expenses in your top categories.
            </Text>
            
            <TouchableOpacity style={[styles.savingsTipButton, {backgroundColor: bankColor}]}>
              <Text style={styles.savingsTipButtonText}>Get Saving Tips</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Share Summary */}
        <TouchableOpacity 
          style={[styles.shareButton, {backgroundColor: bankColor}]}
          onPress={shareTransactionSummary}
        >
          <Icon name="share" size={18} color="#ffffff" />
          <Text style={styles.shareButtonText}>Share Transaction Summary</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  // Get content based on active tab
  const getActiveContent = () => {
    switch (activeTab) {
      case 'credit':
        return (
          <FlatList
            data={filteredTransactions.credits}
            keyExtractor={item => item.id}
            renderItem={renderCreditItem}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No credit transactions found</Text>
              </View>
            }
            refreshControl={
              <RefreshControl 
                refreshing={isRefreshing} 
                onRefresh={onRefresh}
                colors={[bankColor]} 
              />
            }
          />
        );
      case 'debit':
        return (
          <FlatList
            data={filteredTransactions.debits}
            keyExtractor={item => item.id}
            renderItem={renderDebitItem}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No debit transactions found</Text>
              </View>
            }
            refreshControl={
              <RefreshControl 
                refreshing={isRefreshing} 
                onRefresh={onRefresh}
                colors={[bankColor]} 
              />
            }
          />
        );
      case 'analytics':
        return renderCategoryBreakdown();
      case 'insights':
        return renderInsights();
      case 'all':
      default:
        return renderAllTransactions();
    }
  };

  // Handle empty state when no transactions available
  if (!transactions || transactions.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Icon name="account-balance-wallet" size={60} color="#ddd" />
          <Text style={styles.emptyText}>No transactions found</Text>
          <Text style={styles.emptySubtext}>
            We couldn't find any bank transactions. Try syncing your bank account.
          </Text>
          {onRefresh && (
            <TouchableOpacity 
              style={[styles.refreshButton, {backgroundColor: bankColor}]} 
              onPress={onRefresh}
            >
              <Icon name="refresh" size={16} color="#ffffff" />
              <Text style={styles.refreshButtonText}>Sync Transactions</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Summary Card */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Transaction Summary</Text>
        
        <View style={styles.balanceSection}>
          <View style={styles.balanceItem}>
            <Text style={styles.balanceLabel}>Total Credits</Text>
            <Text style={[styles.balanceValue, styles.creditValue]}>
              {formatCurrency(summaryData.totalCredit)}
            </Text>
          </View>
          
          <View style={styles.balanceItem}>
            <Text style={styles.balanceLabel}>Total Debits</Text>
            <Text style={[styles.balanceValue, styles.debitValue]}>
              {formatCurrency(summaryData.totalDebit)}
            </Text>
          </View>
          
          <View style={styles.netBalanceItem}>
            <Text style={styles.balanceLabel}>Net Balance</Text>
            <Text style={[
              styles.balanceValue, 
              summaryData.netBalance >= 0 ? styles.creditValue : styles.debitValue
            ]}>
              {formatCurrency(Math.abs(summaryData.netBalance))}
              {summaryData.netBalance >= 0 ? ' CR' : ' DR'}
            </Text>
          </View>
        </View>

        {/* Credit vs Debit Bar */}
        <View style={styles.barChartContainer}>
          <View style={styles.barChartLabels}>
            <Text style={styles.barChartLabel}>Credit</Text>
            <Text style={styles.barChartLabel}>Debit</Text>
          </View>
          <View style={styles.barChart}>
            <Animated.View 
              style={[
                styles.barCredit, 
                { width: barWidths.credit, backgroundColor: '#4CAF50' }
              ]} 
            />
            <Animated.View 
              style={[
                styles.barDebit, 
                { width: barWidths.debit, backgroundColor: '#F44336' }
              ]} 
            />
          </View>
          <View style={styles.barChartValues}>
            <Text style={[styles.barChartValue, styles.creditValue]}>
              {summaryData.totalCredit + summaryData.totalDebit > 0 
                ? Math.round((summaryData.totalCredit / (summaryData.totalCredit + summaryData.totalDebit)) * 100) 
                : 0}%
            </Text>
            <Text style={[styles.barChartValue, styles.debitValue]}>
              {summaryData.totalCredit + summaryData.totalDebit > 0 
                ? Math.round((summaryData.totalDebit / (summaryData.totalCredit + summaryData.totalDebit)) * 100) 
                : 0}%
            </Text>
          </View>
        </View>
      </View>

      {/* Top Transactions Section */}
      <View style={styles.topTransactionsCard}>
        <Text style={styles.sectionTitle}>Top Transactions</Text>
        
        <View style={styles.topTransactionsTabs}>
          <TouchableOpacity 
            style={[
              styles.topTransactionsTab, 
              summaryData.topCredits.length > 0 && styles.hasTransactionsTab,
              { borderBottomColor: '#4CAF50' }
            ]}
          >
            <Text style={styles.topTransactionsTabTitle}>Top Credits</Text>
            <Text style={[styles.topTransactionsTabAmount, styles.creditValue]}>
              {formatCurrency(summaryData.topCredits.reduce((sum, t) => sum + t.amount, 0))}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.topTransactionsTab, 
              summaryData.topDebits.length > 0 && styles.hasTransactionsTab,
              { borderBottomColor: '#F44336' }
            ]}
          >
            <Text style={styles.topTransactionsTabTitle}>Top Debits</Text>
            <Text style={[styles.topTransactionsTabAmount, styles.debitValue]}>
              {formatCurrency(summaryData.topDebits.reduce((sum, t) => sum + t.amount, 0))}
            </Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.topTransactionsLists}>
          <View style={styles.topTransactionsList}>
            {summaryData.topCredits.length > 0 ? (
              summaryData.topCredits.map((transaction, index) => (
                <TouchableOpacity key={`credit-${index}`} style={styles.topTransactionItem}>
                  <View style={styles.topTransactionItemMain}>
                    <View style={[
                      styles.topTransactionIcon,
                      { backgroundColor: transaction.category ? getCategoryColor(transaction.category, 0.1) : 'rgba(76, 175, 80, 0.1)' }
                    ]}>
                      <Icon 
                        name={transaction.category ? getCategoryIcon(transaction.category) : "arrow-downward"} 
                        size={14} 
                        color={transaction.category ? getCategoryColor(transaction.category) : "#4CAF50"} 
                      />
                    </View>
                    <Text style={styles.topTransactionSender} numberOfLines={1}>
                      {transaction.sender || 'Unknown'}
                    </Text>
                  </View>
                  <Text style={[styles.topTransactionAmount, styles.creditValue]}>
                    {formatCurrency(transaction.amount)}
                  </Text>
                </TouchableOpacity>
              ))
            ) : (
              <Text style={styles.noTransactionsText}>No credit transactions</Text>
            )}
          </View>
          
          <View style={styles.topTransactionsList}>
            {summaryData.topDebits.length > 0 ? (
              summaryData.topDebits.map((transaction, index) => (
                <TouchableOpacity key={`debit-${index}`} style={styles.topTransactionItem}>
                  <View style={styles.topTransactionItemMain}>
                    <View style={[
                      styles.topTransactionIcon,
                      { backgroundColor: transaction.category ? getCategoryColor(transaction.category, 0.1) : 'rgba(244, 67, 54, 0.1)' }
                    ]}>
                      <Icon 
                        name={transaction.category ? getCategoryIcon(transaction.category) : "arrow-upward"} 
                        size={14} 
                        color={transaction.category ? getCategoryColor(transaction.category) : "#F44336"} 
                      />
                    </View>
                    <Text style={styles.topTransactionRecipient} numberOfLines={1}>
                      {transaction.recipient || 'Unknown'}
                    </Text>
                  </View>
                  <Text style={[styles.topTransactionAmount, styles.debitValue]}>
                    {formatCurrency(transaction.amount)}
                  </Text>
                </TouchableOpacity>
              ))
            ) : (
              <Text style={styles.noTransactionsText}>No debit transactions</Text>
            )}
          </View>
        </View>
      </View>

      {/* Transactions List Section */}
      <View style={styles.transactionsCard}>
        <View style={styles.transactionsCardHeader}>
          <Text style={styles.sectionTitle}>All Transactions</Text>
          
          <View style={styles.searchContainer}>
            <Icon name="search" size={20} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search transactions..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#999"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Icon name="close" size={20} color="#666" />
              </TouchableOpacity>
            )}
          </View>
        </View>
        
        <View style={styles.tabsContainer}>
          <TouchableOpacity 
            style={[
              styles.tab, 
              activeTab === 'all' && [styles.activeTab, { borderBottomColor: bankColor }]
            ]}
            onPress={() => setActiveTab('all')}
          >
            <Text style={[
              styles.tabText, 
              activeTab === 'all' && { color: bankColor, fontWeight: 'bold' }
            ]}>
              All
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.tab, 
              activeTab === 'credit' && [styles.activeTab, { borderBottomColor: '#4CAF50' }]
            ]}
            onPress={() => setActiveTab('credit')}
          >
            <Text style={[
              styles.tabText, 
              activeTab === 'credit' && { color: '#4CAF50', fontWeight: 'bold' }
            ]}>
              Credits
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.tab, 
              activeTab === 'debit' && [styles.activeTab, { borderBottomColor: '#F44336' }]
            ]}
            onPress={() => setActiveTab('debit')}
          >
            <Text style={[
              styles.tabText, 
              activeTab === 'debit' && { color: '#F44336', fontWeight: 'bold' }
            ]}>
              Debits
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
              styles.tab, 
              activeTab === 'analytics' && [styles.activeTab, { borderBottomColor: bankColor }]
            ]}
            onPress={() => setActiveTab('analytics')}
          >
            <Text style={[
              styles.tabText, 
              activeTab === 'analytics' && { color: bankColor, fontWeight: 'bold' }
            ]}>
              Analytics
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.tab, 
              activeTab === 'insights' && [styles.activeTab, { borderBottomColor: bankColor }]
            ]}
            onPress={() => setActiveTab('insights')}
          >
            <Text style={[
              styles.tabText, 
              activeTab === 'insights' && { color: bankColor, fontWeight: 'bold' }
            ]}>
              Insights
            </Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.transactionsList}>
          {getActiveContent()}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  // Summary Card
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  balanceSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  balanceItem: {
    flex: 1,
    alignItems: 'center',
  },
  netBalanceItem: {
    flex: 1,
    alignItems: 'center',
    borderLeftWidth: 1,
    borderLeftColor: '#eee',
  },
  balanceLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  balanceValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  creditValue: {
    color: '#4CAF50',
  },
  debitValue: {
    color: '#F44336',
  },
  barChartContainer: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  barChartLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  barChartLabel: {
    fontSize: 12,
    color: '#666',
  },
  barChart: {
    flexDirection: 'row',
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barCredit: {
    height: '100%',
  },
  barDebit: {
    height: '100%',
  },
  barChartValues: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  barChartValue: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  
  // Top Transactions Card
  topTransactionsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  topTransactionsTabs: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  topTransactionsTab: {
    flex: 1,
    padding: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#ddd',
  },
  hasTransactionsTab: {
    borderBottomWidth: 2,
  },
  topTransactionsTabTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  topTransactionsTabAmount: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  topTransactionsLists: {
    flexDirection: 'row',
  },
  topTransactionsList: {
    flex: 1,
    marginHorizontal: 4,
  },
  topTransactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  topTransactionItemMain: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  topTransactionIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  topTransactionSender: {
    flex: 1,
    fontSize: 12,
    color: '#333',
    marginRight: 8,
  },
  topTransactionRecipient: {
    flex: 1,
    fontSize: 12,
    color: '#333',
    marginRight: 8,
  },
  topTransactionAmount: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  noTransactionsText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 8,
  },
  
  // Transactions Card
  transactionsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flex: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  transactionsCardHeader: {
    marginBottom: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#444',
    padding: 0,
  },
  tabsContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 13,
    color: '#666',
  },
  transactionsList: {
    flex: 1,
  },
  
  // Transaction Item
  transactionItem: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  transactionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  transactionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionSender: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  transactionRecipient: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  transactionDescription: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  transactionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  transactionDate: {
    fontSize: 12,
    color: '#666',
    marginRight: 8,
  },
  categoryTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 2,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  creditAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginLeft: 8,
  },
  debitAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#F44336',
    marginLeft: 8,
  },
  
  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#888',
    marginTop: 15,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#aaa',
    textAlign: 'center',
    marginTop: 5,
    marginBottom: 20,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 16,
  },
  refreshButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    marginLeft: 6,
  },
  
  // Category Breakdown
  categoryBreakdown: {
    flex: 1,
    padding: 8,
  },
  categoryBreakdownTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  categoryBreakdownItem: {
    marginBottom: 16,
  },
  categoryBreakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  categoryBreakdownNameSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  categoryBreakdownName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  categoryBreakdownValues: {
    alignItems: 'flex-end',
  },
  categoryBreakdownPercentage: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#555',
  },
  categoryBreakdownAmount: {
    fontSize: 12,
    color: '#666',
  },
  categoryBreakdownBarContainer: {
    marginTop: 2,
  },
  categoryBreakdownBarBg: {
    backgroundColor: '#f0f0f0',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  categoryBreakdownBar: {
    height: '100%',
  },
  noDataText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 24,
  },
  
  // Monthly trends
  monthlyTrendsSection: {
    marginTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 16,
  },
  monthlyTrendsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  monthlyTrendItem: {
    marginBottom: 20,
  },
  monthlyTrendMonth: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  monthlyTrendBars: {},
  monthlyTrendBarContainer: {
    marginBottom: 12,
  },
  monthlyTrendLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  monthlyTrendBarWrapper: {
    backgroundColor: '#f0f0f0',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 2,
  },
  monthlyTrendBar: {
    height: '100%',
  },
  monthlyTrendAmount: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  
  // Insights
  insightsContainer: {
    flex: 1,
    padding: 8,
  },
  insightsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  insightCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  insightCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  insightCardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  trendInsight: {
    flexDirection: 'column',
  },
  trendMonth: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  trendMonthName: {
    fontSize: 12,
    color: '#666',
  },
  trendDebitAmount: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#F44336',
  },
  trendComparison: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
  },
  trendDelta: {
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  topCategoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  topCategoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  topCategoryIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  topCategoryName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  topCategoryAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#F44336',
  },
  savingsContainer: {
    alignItems: 'center',
  },
  savingsText: {
    fontSize: 13,
    color: '#333',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  savingsAmount: {
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  savingsTipButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  savingsTipButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginVertical: 16,
  },
  shareButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
  }
});

export default BankTransactionsDisplay;