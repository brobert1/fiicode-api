const createNotification = (address, type) => {

  const trimmedAddress = address.split(',')[0].trim();
  let title = '';
  let body = '';

  switch (type.toLowerCase()) {
    case 'congestion':
      title = `Congestion on ${trimmedAddress}`;
      body = `Expect delays on ${trimmedAddress} due to heavy traffic. It might be a good time to consider alternative routes!`;
      break;
    case 'accident':
      title = `Accident near ${trimmedAddress}`;
      body = `There's been an accident near ${trimmedAddress}. Please exercise caution and plan your route accordingly.`;
      break;
    case 'construction':
      title = `Construction work on ${trimmedAddress}`;
      body = `Road construction is underway on ${trimmedAddress}. Expect some delays and plan for an alternate route.`;
      break;
    default:
      title = `Alert on ${trimmedAddress}`;
      body = `There's an alert near ${trimmedAddress}. Stay updated and be cautious while traveling.`;
      break;
  }

  return { title, body };
};

export default createNotification;
