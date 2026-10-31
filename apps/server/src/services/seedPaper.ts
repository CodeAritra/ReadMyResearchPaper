import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { StoredPaper, paperStore } from './paperStore.js';
import { chunkPaperBySections, retrievalService } from './retrieval.js';

export const ATTENTION_PAPER_ID = 'paper-attention';

export const ATTENTION_RAW_MARKDOWN = `# Attention Is All You Need

Ashish Vaswani, Noam Shazeer, Niki Parmar, Jakob Uszkoreit, Llion Jones, Aidan N. Gomez, Łukasz Kaiser, Illia Polosukhin
Google Brain, Google Research, University of Toronto

## Abstract
[PAGE 1]
The dominant sequence transduction models are based on complex recurrent or convolutional neural networks that include an encoder and a decoder. The best performing models also connect the encoder and decoder through an attention mechanism. We propose a new simple network architecture, the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely. Experiments on two machine translation tasks show these models to be superior in quality while being more parallelizable and requiring significantly less time to train. Our model achieves 28.4 BLEU on the WMT 2014 English-to-German translation task, improving over the existing best results, including ensembles, by over 2 BLEU. On the WMT 2014 English-to-French translation task, our model establishes a new single-model state-of-the-art BLEU score of 41.8 after training for 3.5 days on eight GPUs.

## 1 Introduction
[PAGE 1]
Recurrent neural networks, especially long short-term memory (LSTM) and gated recurrent (GRU) neural networks, have been firmly established as state of the art approaches in sequence modeling and transduction problems such as language modeling and machine translation. Recurrent models typically factor computation along the symbol positions of the input and output sequences. Generating a sequence of hidden states $h_t$, as a function of the previous hidden state $h_{t-1}$ and the input for position $t$, this inherently sequential nature precludes parallelization within training examples.

In this work we propose the Transformer, a model architecture eschewing recurrence and instead relying entirely on an attention mechanism to draw global dependencies between input and output. The Transformer allows for significantly more parallelization and can reach a new state of the art in translation quality after being trained for as little as twelve hours on eight P100 GPUs.

## 2 Background
[PAGE 2]
The goal of reducing sequential computation also forms the foundation of the Extended Neural GPU, ByteNet and ConvS2S, all of which use convolutional neural networks as basic building blocks. In these models, the number of operations required to relate signals from two arbitrary input or output positions grows in the distance between positions, linearly for ConvS2S and logarithmically for ByteNet. This makes it more difficult to learn dependencies between distant positions. In the Transformer this is reduced to a constant number of operations.

Self-attention, sometimes called intra-attention, is an attention mechanism relating different positions of a single sequence in order to compute a representation of the sequence.

## 3 Model Architecture
[PAGE 2]
Most competitive neural sequence transduction models have an encoder-decoder structure. Here, the encoder maps an input sequence of symbol representations $(x_1, \dots, x_n)$ to a sequence of continuous representations $\\mathbf{z} = (z_1, \dots, z_n)$. Given $\\mathbf{z}$, the decoder then generates an output sequence $(y_1, \dots, y_m)$ of symbols one element at a time. At each step the model is auto-regressive, consuming the previously generated symbols as additional input when generating the next.

The Transformer follows this overall architecture using stacked self-attention and point-wise, fully connected layers for both the encoder and decoder, shown in the left and right halves of Figure 1.

## 3.1 Encoder and Decoder Stacks
[PAGE 2]
Encoder: The encoder is composed of a stack of $N = 6$ identical layers. Each layer has two sub-layers. The first is a multi-head self-attention mechanism, and the second is a simple, position-wise fully connected feed-forward network. We employ a residual connection around each of the two sub-layers, followed by layer normalization. That is, the output of each sub-layer is $\\text{LayerNorm}(x + \\text{Sublayer}(x))$, where $\\text{Sublayer}(x)$ is the function implemented by the sub-layer itself. To facilitate these residual connections, all sub-layers in the model, as well as the embedding layers, produce outputs of dimension $d_{\\text{model}} = 512$.

Decoder: The decoder is also composed of a stack of $N = 6$ identical layers. In addition to the two sub-layers in each encoder layer, the decoder inserts a third sub-layer, which performs multi-head attention over the output of the encoder stack. Similar to the encoder, we employ residual connections around each of the sub-layers, followed by layer normalization. We also modify the self-attention sub-layer in the decoder stack to prevent positions from attending to subsequent positions.

## 3.2 Attention
[PAGE 3]
An attention function can be described as mapping a query and a set of key-value pairs to an output, where the query, keys, values, and output are all vectors. The output is computed as a weighted sum of the values, where the weight assigned to each value is computed by a compatibility function of the query with the corresponding key.

## 3.2.1 Scaled Dot-Product Attention
[PAGE 3]
We call our particular attention "Scaled Dot-Product Attention". The input consists of queries and keys of dimension $d_k$, and values of dimension $d_v$. We compute the dot products of the query with all keys, divide each by $\\sqrt{d_k}$, and apply a softmax function to obtain the weights on the values.

In practice, we compute the attention function on a set of queries simultaneously, packed together into a matrix $Q$. The keys and values are also packed into matrices $K$ and $V$. We compute the matrix of outputs as:

$$\\text{Attention}(Q, K, V) = \\text{softmax}\\left(\\frac{QK^T}{\\sqrt{d_k}}\\right)V$$

The two most commonly used attention functions are additive attention and dot-product (multiplicative) attention. Dot-product attention is identical to our algorithm, except for the scaling factor of $\\frac{1}{\\sqrt{d_k}}$. We suspect that for large values of $d_k$, the dot products grow large in magnitude, pushing the softmax function into regions where it has extremely small gradients. To counteract this effect, we scale the dot products by $\\frac{1}{\\sqrt{d_k}}$.

## 3.2.2 Multi-Head Attention
[PAGE 4]
Instead of performing a single attention function with $d_{\\text{model}}$-dimensional queries, keys and values, we found it beneficial to linearly project the queries, keys and values $h$ times with different, learned linear projections to $d_k$, $d_k$ and $d_v$ dimensions, respectively. On each of these projected versions of queries, keys and values we then perform the attention function in parallel, yielding $d_v$-dimensional output values. These are concatenated and once again projected, resulting in the final values.

Multi-head attention allows the model to jointly attend to information from different representation subspaces at different positions:

$$\\text{MultiHead}(Q, K, V) = \\text{Concat}(\\text{head}_1, \\dots, \\text{head}_h)W^O$$

$$\\text{where} \\quad \\text{head}_i = \\text{Attention}(QW_i^Q, KW_i^K, VW_i^V)$$

Where the projections are parameter matrices $W_i^Q \\in \\mathbb{R}^{d_{\\text{model}} \\times d_k}$, $W_i^K \\in \\mathbb{R}^{d_{\\text{model}} \\times d_k}$, $W_i^V \\in \\mathbb{R}^{d_{\\text{model}} \\times d_v}$ and $W^O \\in \\mathbb{R}^{h d_v \\times d_{\\text{model}}}$. In this work we employ $h = 8$ parallel attention layers, or heads. For each of these we use $d_k = d_v = d_{\\text{model}} / h = 64$. Due to the reduced dimension of each head, the total computational cost is similar to that of single-head attention with full dimensionality.

## 3.2.3 Applications of Attention in our Model
[PAGE 5]
The Transformer uses multi-head attention in three different ways:
1. In "encoder-decoder attention" layers, the queries come from the previous decoder layer, and the memory keys and values come from the output of the encoder. This mimics the typical encoder-decoder attention mechanisms in sequence-to-sequence models.
2. The encoder contains self-attention layers. In a self-attention layer all of the keys, values and queries come from the same place, in this case, the output of the previous layer in the encoder.
3. Similarly, self-attention layers in the decoder allow each position in the decoder to attend to all positions in the decoder up to and including that position. We need to prevent leftward information flow in the decoder to preserve the auto-regressive property.

## 3.3 Position-wise Feed-Forward Networks
[PAGE 5]
In addition to attention sub-layers, each of the layers in our encoder and decoder contains a fully connected feed-forward network, which is applied to each position separately and identically. This consists of two linear transformations with a ReLU activation in between:

$$\\text{FFN}(x) = \\max(0, xW_1 + b_1)W_2 + b_2$$

While the linear transformations are the same across different positions, they use different parameters from layer to layer. Another way of describing this is as two convolutions with kernel size 1. The dimensionality of input and output is $d_{\\text{model}} = 512$, and the inner-layer has dimensionality $d_{ff} = 2048$.

## 3.5 Positional Encoding
[PAGE 6]
Since our model contains no recurrence and no convolution, in order for the model to make use of the order of the sequence, we must inject some information about the relative or absolute positions of the tokens in the sequence. To this end, we add "positional encodings" to the input embeddings at the bottoms of the encoder and decoder stacks. The positional encodings have the same dimension $d_{\\text{model}}$ as the embeddings, so that the two can be summed.

In this work, we use sine and cosine functions of different frequencies:

$$PE_{(pos, 2i)} = \\sin\\left(\\frac{pos}{10000^{2i/d_{\\text{model}}}}\\right)$$
$$PE_{(pos, 2i+1)} = \\cos\\left(\\frac{pos}{10000^{2i/d_{\\text{model}}}}\\right)$$

where $pos$ is the position and $i$ is the dimension.

## 4 Why Self-Attention
[PAGE 6]
In this section we compare various aspects of self-attention layers to the recurrent and convolutional layers commonly used for mapping one variable-length sequence of symbol representations $(x_1, \\dots, x_n)$ to another sequence of equal length $(z_1, \\dots, z_n)$.

As noted in Table 1, a self-attention layer connects all positions with a constant number of sequentially executed operations $O(1)$, whereas a recurrent layer requires $O(n)$ sequential operations. In terms of computational complexity, self-attention layers are faster than recurrent layers when the sequence length $n$ is smaller than the representation dimensionality $d$.

## 5 Training & Hyperparameters
[PAGE 7]
Training Data and Batching: We trained on the standard WMT 2014 English-German dataset consisting of about 4.5 million sentence pairs. For English-French, we used the significantly larger WMT 2014 English-French dataset consisting of 36 million sentence pairs.

Hardware and Schedule: We trained our models on one machine with 8 NVIDIA P100 GPUs. For our base models using the hyperparameters described throughout the paper, each training step took about 0.4 seconds. We trained the base models for a total of 100,000 steps or 12 hours. For our big models, step time was 1.0 seconds. The big models were trained for 300,000 steps (3.5 days).

Optimizer: We used the Adam optimizer with $\\beta_1 = 0.9$, $\\beta_2 = 0.98$ and $\\epsilon = 10^{-9}$. We varied the learning rate over the course of training, according to the formula:

$$\\text{lrate} = d_{\\text{model}}^{-0.5} \\cdot \\min(step\\_num^{-0.5}, step\\_num \\cdot warmup\\_steps^{-1.5})$$

This corresponds to increasing the learning rate linearly for the first $warmup\\_steps = 4000$ training steps, and decreasing it thereafter proportionally to the inverse square root of the step number.

## 6 Results
[PAGE 8]
On the WMT 2014 English-to-German translation task, the big transformer model (Transformer (big) in Table 2) outperforms the best previously reported models (including ensembles) by more than 2.0 BLEU, establishing a new state-of-the-art BLEU score of 28.4. The configuration of this model is listed in the bottom line of Table 3. Training took 3.5 days on 8 P100 GPUs. Even our base model surpasses all previously published models and ensembles, at a fraction of the training cost.

On the WMT 2014 English-to-French translation task, our big model achieves a BLEU score of 41.8, outperforming all of the previously published single models, at less than 1/4 the training cost of the previous state-of-the-art model.

Table 2: Comparison with prior models on WMT 2014 English-to-German and English-to-French:
| Model | EN-DE BLEU | EN-FR BLEU | Training Cost (FLOPs) |
|---|---|---|---|
| ByteNet | 23.75 | - | - |
| Deep-Att + PosUnk | - | 39.2 | $1.0 \\times 10^{20}$ |
| GNMT + RL | 24.6 | 39.92 | $2.3 \\times 10^{19}$ |
| ConvS2S | 25.16 | 40.46 | $9.6 \\times 10^{18}$ |
| Transformer (base) | 27.3 | 38.1 | $3.3 \\times 10^{18}$ |
| Transformer (big) | **28.4** | **41.8** | $2.3 \\times 10^{19}$ |

## 7 Conclusion
[PAGE 10]
In this work, we presented the Transformer, the first sequence transduction model based entirely on attention, replacing the recurrent layers most commonly used in encoder-decoder architectures with multi-head self-attention. For translation tasks, the Transformer can be trained significantly faster than architectures based on recurrent or convolutional layers. On both WMT 2014 English-to-German and WMT 2014 English-to-French translation tasks, we achieve a new state of the art. In the former task our best model out-performs even all previously reported ensembles.
`;

export function seedAttentionPaper(): StoredPaper {
  const uploadDir = path.resolve(process.cwd(), 'uploads');
  const filePath = path.resolve(uploadDir, 'attention-is-all-you-need.pdf');

  const paper: StoredPaper = {
    id: ATTENTION_PAPER_ID,
    title: 'Attention Is All You Need',
    authors: [
      'Ashish Vaswani',
      'Noam Shazeer',
      'Niki Parmar',
      'Jakob Uszkoreit',
      'Llion Jones',
      'Aidan N. Gomez',
      'Łukasz Kaiser',
      'Illia Polosukhin',
    ],
    pageCount: 11,
    filePath,
    createdAt: new Date().toISOString(),
    sections: [
      { title: 'Abstract', pageNumber: 1 },
      { title: '1 Introduction', pageNumber: 1 },
      { title: '2 Background', pageNumber: 2 },
      { title: '3 Model Architecture', pageNumber: 2 },
      { title: '3.1 Encoder and Decoder Stacks', pageNumber: 2 },
      { title: '3.2 Attention', pageNumber: 3 },
      { title: '3.2.1 Scaled Dot-Product Attention', pageNumber: 3 },
      { title: '3.2.2 Multi-Head Attention', pageNumber: 4 },
      { title: '3.2.3 Applications of Attention', pageNumber: 5 },
      { title: '3.3 Position-wise Feed-Forward Networks', pageNumber: 5 },
      { title: '3.5 Positional Encoding', pageNumber: 6 },
      { title: '4 Why Self-Attention', pageNumber: 6 },
      { title: '5 Training & Hyperparameters', pageNumber: 7 },
      { title: '6 Results', pageNumber: 8 },
      { title: '7 Conclusion', pageNumber: 10 },
    ],
    rawMarkdown: ATTENTION_RAW_MARKDOWN,
    fileHash: fs.existsSync(filePath)
      ? crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex')
      : undefined,
  };

  // Persist into paper store
  paperStore.savePaper(paper);

  // Chunk and index into retrieval engine
  const chunks = chunkPaperBySections(paper, ATTENTION_RAW_MARKDOWN);
  retrievalService.indexChunks(chunks);

  return paper;
}
