// From chadhutchins:
// https://gist.github.com/chadhutchins/1440602

import type { Vertex } from './vertex'
import { VertexStack } from './vertex-stack'

export class Tarjan {
  private index: number
  private stack: VertexStack
  private readonly graph: Vertex[]
  private readonly scc: Vertex[][]

  constructor(graph: Vertex[]) {
    this.index = 0
    this.stack = new VertexStack()
    this.graph = graph
    this.scc = []
  }
  public run(): Vertex[][] {
    for (const i in this.graph)
      if (this.graph[i].index < 0) this.strongconnectIterative(this.graph[i])
    return this.scc
  }
  private strongconnectIterative(startVertex: Vertex): void {
    const dfsStack: Array<{ vertex: Vertex; nextNeighborIdx: number }> = []

    // Initialize start vertex
    startVertex.index = this.index
    startVertex.lowlink = this.index
    this.index++
    this.stack.vertices.push(startVertex)
    startVertex.onStack = true

    dfsStack.push({ vertex: startVertex, nextNeighborIdx: 0 })

    while (dfsStack.length > 0) {
      const frame = dfsStack.at(-1)!
      const v = frame.vertex

      if (frame.nextNeighborIdx < v.connections.length) {
        // Process next neighbor
        const w = v.connections[frame.nextNeighborIdx]
        frame.nextNeighborIdx++

        if (w.index < 0) {
          // w is unvisited - "recurse" on it
          w.index = this.index
          w.lowlink = this.index
          this.index++
          this.stack.vertices.push(w)
          w.onStack = true

          dfsStack.push({ vertex: w, nextNeighborIdx: 0 })
        } else if (w.onStack) {
          // w is in current SCC - update lowlink
          v.lowlink = Math.min(v.lowlink, w.index)
        }
      } else {
        // All neighbors processed - "return" from this vertex
        dfsStack.pop()

        // If v is a root node, pop the stack and generate an SCC
        if (v.lowlink === v.index) {
          const scc: Vertex[] = []
          let w: Vertex | undefined
          do {
            w = this.stack.vertices.pop()
            if (w) {
              w.onStack = false
              scc.push(w)
            }
          } while (w && w !== v)

          if (scc.length > 0) {
            this.scc.push(scc)
          }
        }

        // Update parent's lowlink with our final lowlink
        if (dfsStack.length > 0) {
          const parent = dfsStack.at(-1)!.vertex
          parent.lowlink = Math.min(parent.lowlink, v.lowlink)
        }
      }
    }
  }
}
