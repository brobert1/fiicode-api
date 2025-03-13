const getCongestionDescription = (congestionLevel) => {
  if (congestionLevel < 20) {
    return 'Low congestion';
  } else if (congestionLevel < 50) {
    return 'Medium Congestion';
  } else {
    return 'High congestion';
  }
};

export default getCongestionDescription;
