if (`${process.env.CI}` === 'true') {
  jest.setTimeout(100000);
}
