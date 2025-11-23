const { mongoose } = require("../config/database");

const gridSchema = new mongoose.Schema({
  A1:String,B1:String,C1:String,D1:String,E1:String,F1:String,G1:String,H1:String,
  I1:String,J1:String,K1:String,L1:String,M1:String,N1:String,O1:String,P1:String,
  answer3letters:[String],
  answer4letters:[String],
  answer5letters:[String],
  answer6letters:[String],
  answer7letters:[String],
  answer8letters:[String],
  answer9letters:[String],
  answer10letters:[String],
  answer11letters:[String],
  answer12letters:[String],
  answer13letters:[String],
  randomBaseWordNoSplit:String,
  randomCombo:[String]
}, { timestamps: true });

module.exports = mongoose.model("Grid", gridSchema);
